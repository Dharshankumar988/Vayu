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
      case 'list': {
        const { room_id } = data;
        const { data: racks, error } = await supabase
          .from('racks')
          .select('*')
          .eq('room_id', room_id)
          .order('display_order', { ascending: true });
        
        if (error) throw error;
        return NextResponse.json({ data: racks });
      }

      case 'create': {
        const { room_id, name } = data;
        
        // Get max display_order
        const { data: maxOrderData, error: maxError } = await supabase
          .from('racks')
          .select('display_order')
          .eq('room_id', room_id)
          .order('display_order', { ascending: false })
          .limit(1);
          
        let display_order = 0;
        if (!maxError && maxOrderData && maxOrderData.length > 0) {
            display_order = (maxOrderData[0].display_order || 0) + 1;
        }

        const { data: rack, error: rackError } = await supabase
          .from('racks')
          .insert({ room_id, name, display_order })
          .select()
          .single();
          
        if (rackError) throw rackError;

        // Auto-create 4 slots
        const slotsToInsert = [];
        for (let i = 1; i <= 4; i++) {
            slotsToInsert.push({
                rack_id: rack.id,
                position: i,
                status: 'available',
                health: 'healthy'
            });
        }
        await supabase.from('server_slots').insert(slotsToInsert);

        return NextResponse.json({ data: rack });
      }

      case 'delete': {
        const { id } = data;
        
        // Check for occupied slots
        const { data: occupiedSlots } = await supabase
            .from('server_slots')
            .select('id')
            .eq('rack_id', id)
            .in('status', ['occupied', 'reserved'])
            .limit(1);
            
        if (occupiedSlots && occupiedSlots.length > 0) {
            return NextResponse.json({ error: 'Cannot delete rack with occupied or reserved slots' }, { status: 400 });
        }

        const { error } = await supabase.from('racks').delete().eq('id', id);
        if (error) throw error;
        return NextResponse.json({ success: true });
      }

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error: any) {
    console.error('Racks API Error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
