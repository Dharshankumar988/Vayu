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
      case 'list_available': {
        const { data_center_id, room_id, rack_id } = data;
        let query = supabase.from('server_slots').select(`
          *,
          racks!inner(id, name, room_id),
          rooms!inner(id, name, data_center_id),
          data_centers!inner(id, name, region)
        `).eq('status', 'available');

        if (rack_id) query = query.eq('rack_id', rack_id);
        if (room_id) query = query.eq('racks.room_id', room_id);
        if (data_center_id) query = query.eq('rooms.data_center_id', data_center_id);

        const { data: slots, error } = await query;
        if (error) throw error;
        return NextResponse.json({ data: slots });
      }

      case 'reserve': {
        const { slot_id, client_id } = data;
        
        // Verify available
        const { data: slot, error: checkError } = await supabase
          .from('server_slots')
          .select('status')
          .eq('id', slot_id)
          .single();
          
        if (checkError) throw checkError;
        if (slot.status !== 'available') {
            return NextResponse.json({ error: 'Slot is not available' }, { status: 400 });
        }

        const { data: updatedSlot, error } = await supabase
          .from('server_slots')
          .update({
             status: 'reserved',
             reserved_by: client_id,
             reserved_at: new Date().toISOString()
          })
          .eq('id', slot_id)
          .select()
          .single();
          
        if (error) throw error;
        return NextResponse.json({ data: updatedSlot });
      }

      case 'occupy': {
        const { slot_id, client_id, server_name } = data;
        
        const { data: slot, error: checkError } = await supabase
          .from('server_slots')
          .select('status, reserved_by')
          .eq('id', slot_id)
          .single();
          
        if (checkError) throw checkError;
        if (slot.status !== 'available' && !(slot.status === 'reserved' && slot.reserved_by === client_id)) {
            return NextResponse.json({ error: 'Slot is not available for occupancy' }, { status: 400 });
        }

        const { data: updatedSlot, error } = await supabase
          .from('server_slots')
          .update({
             status: 'occupied',
             client_id: client_id,
             server_name: server_name,
             health: 'healthy',
             cpu_util: 0,
             mem_util: 0
          })
          .eq('id', slot_id)
          .select()
          .single();
          
        if (error) throw error;

        // Also create a server_allocation record
        // We need data_center_id for this
        const { data: slotWithDc } = await supabase.from('server_slots')
            .select('rack_id')
            .eq('id', slot_id)
            .single();
            
        if (slotWithDc) {
            const { data: rack } = await supabase.from('racks').select('room_id').eq('id', slotWithDc.rack_id).single();
            if (rack) {
                const { data: room } = await supabase.from('rooms').select('data_center_id').eq('id', rack.room_id).single();
                if (room) {
                    await supabase.from('server_allocations').insert({
                        client_id,
                        slot_id,
                        data_center_id: room.data_center_id,
                        is_active: true
                    });
                }
            }
        }

        return NextResponse.json({ data: updatedSlot });
      }

      case 'release': {
        const { slot_id, client_id } = data;
        
        const { data: slot, error: checkError } = await supabase
          .from('server_slots')
          .select('client_id')
          .eq('id', slot_id)
          .single();
          
        if (checkError) throw checkError;
        // Allow release if client matches, or if admin is forcing it (handled via permissions typically, but we'll just check client for now if provided)
        if (client_id && slot.client_id !== client_id) {
             return NextResponse.json({ error: 'Not authorized to release this slot' }, { status: 403 });
        }

        const { error } = await supabase
          .from('server_slots')
          .update({
             status: 'available',
             client_id: null,
             server_name: null,
             reserved_by: null,
             reserved_at: null,
             cpu_util: 0,
             mem_util: 0
          })
          .eq('id', slot_id);
          
        if (error) throw error;

        // Mark server_allocation inactive
        await supabase
            .from('server_allocations')
            .update({ is_active: false, end_date: new Date().toISOString() })
            .eq('slot_id', slot_id)
            .eq('is_active', true);

        return NextResponse.json({ success: true });
      }

      case 'maintenance': {
        const { slot_id } = data;
        const { error } = await supabase
          .from('server_slots')
          .update({ status: 'maintenance' })
          .eq('id', slot_id);
          
        if (error) throw error;
        return NextResponse.json({ success: true });
      }
      
      case 'get_client_slots': {
          const { client_id } = data;
          
          // Using raw supabase query or simple joins
          // A proper join requires postgrest config, let's fetch slots and then enrich
          const { data: slots, error } = await supabase
            .from('server_slots')
            .select('*')
            .eq('client_id', client_id);
            
          if (error) throw error;
          
          if (!slots || slots.length === 0) return NextResponse.json({ data: [] });
          
          const rackIds = [...new Set(slots.map(s => s.rack_id))];
          const { data: racks } = await supabase.from('racks').select('*').in('id', rackIds);
          
          const roomIds = [...new Set((racks || []).map(r => r.room_id))];
          const { data: rooms } = await supabase.from('rooms').select('*').in('id', roomIds);
          
          const dcIds = [...new Set((rooms || []).map(r => r.data_center_id))];
          const { data: dcs } = await supabase.from('data_centers').select('*').in('id', dcIds);
          
          const enrichedSlots = slots.map(slot => {
              const rack = (racks || []).find(r => r.id === slot.rack_id);
              const room = rack ? (rooms || []).find(r => r.id === rack.room_id) : null;
              const dc = room ? (dcs || []).find(d => d.id === room.data_center_id) : null;
              
              return {
                  ...slot,
                  rack_name: rack?.name,
                  room_name: room?.name,
                  dc_name: dc?.name,
                  dc_region: dc?.region
              };
          });
          
          return NextResponse.json({ data: enrichedSlots });
      }

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error: any) {
    console.error('Slots API Error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
