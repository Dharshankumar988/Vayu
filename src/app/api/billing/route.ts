import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, ...data } = body;

    switch (action) {
      case 'create': {
        const { client_id, slot_ids, duration_months, data_center_id, room_id, rack_id } = data;
        
        // Calculate pricing
        // Get DC price
        const { data: dc, error: dcError } = await supabase
            .from('data_centers')
            .select('price_per_slot_month')
            .eq('id', data_center_id)
            .single();
            
        if (dcError) throw dcError;
        let price = dc.price_per_slot_month || 120.00;
        
        // Override with room/rack if present
        if (room_id) {
            const { data: room } = await supabase.from('rooms').select('price_override_per_slot').eq('id', room_id).single();
            if (room && room.price_override_per_slot !== null) price = room.price_override_per_slot;
        }
        
        if (rack_id) {
            const { data: rack } = await supabase.from('racks').select('price_override_per_slot').eq('id', rack_id).single();
            if (rack && rack.price_override_per_slot !== null) price = rack.price_override_per_slot;
        }
        
        let discount = 0;
        if (duration_months >= 12) discount = 0.20;
        else if (duration_months >= 6) discount = 0.10;
        
        const total = slot_ids.length * price * duration_months * (1 - discount);
        
        const { data: billingRecord, error: billingError } = await supabase
            .from('billing_records')
            .insert({
                client_id,
                amount_usd: total,
                slots_count: slot_ids.length,
                duration_months,
                billing_period: `${duration_months} months`,
                status: 'paid', // Auto-paid for demo
                data_center_id,
                room_id,
                rack_id,
                price_per_slot: price,
                discount_pct: discount * 100,
                start_date: new Date().toISOString().split('T')[0],
                // Approximation for end date
                end_date: new Date(new Date().setMonth(new Date().getMonth() + duration_months)).toISOString().split('T')[0]
            })
            .select()
            .single();
            
        if (billingError) throw billingError;
        
        return NextResponse.json({ data: billingRecord });
      }

      case 'list': {
        const { client_id } = data;
        const { data: records, error } = await supabase
          .from('billing_records')
          .select('*, data_centers(name)')
          .eq('client_id', client_id)
          .order('created_at', { ascending: false });
        
        if (error) throw error;
        
        // Flatten dc name
        const flatRecords = (records || []).map(r => ({
            ...r,
            dc_name: r.data_centers?.name
        }));
        
        return NextResponse.json({ data: flatRecords });
      }

      case 'summary': {
        const { client_id } = data;
        
        const { data: records, error } = await supabase
          .from('billing_records')
          .select('amount_usd')
          .eq('client_id', client_id);
          
        if (error) throw error;
        
        const total_spent = (records || []).reduce((sum, r) => sum + Number(r.amount_usd), 0);
        
        const { data: activeSlots } = await supabase
            .from('server_slots')
            .select('id')
            .eq('client_id', client_id)
            .eq('status', 'occupied');
            
        const active_slots_count = activeSlots ? activeSlots.length : 0;
        
        return NextResponse.json({ 
            data: {
                total_spent,
                active_slots_count,
                monthly_cost: active_slots_count * 120 // simplified
            } 
        });
      }

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error: any) {
    console.error('Billing API Error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
