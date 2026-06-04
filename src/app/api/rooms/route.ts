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
        const { data_center_id } = data;
        const { data: rooms, error } = await supabase
          .from('rooms')
          .select('*')
          .eq('data_center_id', data_center_id)
          .order('display_order', { ascending: true });
        
        if (error) throw error;
        return NextResponse.json({ data: rooms });
      }

      case 'create': {
        const { data_center_id, name } = data;
        
        // Get max display_order
        const { data: maxOrderData, error: maxError } = await supabase
          .from('rooms')
          .select('display_order')
          .eq('data_center_id', data_center_id)
          .order('display_order', { ascending: false })
          .limit(1);
          
        let display_order = 0;
        if (!maxError && maxOrderData && maxOrderData.length > 0) {
            display_order = (maxOrderData[0].display_order || 0) + 1;
        }

        const { data: room, error: roomError } = await supabase
          .from('rooms')
          .insert({ data_center_id, name, display_order })
          .select()
          .single();
          
        if (roomError) throw roomError;

        // Auto-create 4 default racks
        const racksToInsert = Array.from({ length: 4 }).map((_, i) => ({
            room_id: room.id,
            name: `Rack ${i + 1}`,
            display_order: i
        }));
        
        const { data: insertedRacks, error: racksError } = await supabase
            .from('racks')
            .insert(racksToInsert)
            .select();
            
        if (!racksError && insertedRacks) {
             const slotsToInsert = [];
             for (const rack of insertedRacks) {
                for (let i = 1; i <= 4; i++) {
                    slotsToInsert.push({
                        rack_id: rack.id,
                        position: i,
                        status: 'available',
                        health: 'healthy'
                    });
                }
            }
            await supabase.from('server_slots').insert(slotsToInsert);
        }

        return NextResponse.json({ data: room });
      }

      case 'update': {
        const { id, ...updateFields } = data;
        const { data: room, error } = await supabase
          .from('rooms')
          .update(updateFields)
          .eq('id', id)
          .select()
          .single();
        if (error) throw error;
        return NextResponse.json({ data: room });
      }

      case 'delete': {
        const { id } = data;
        
        // Check for occupied slots
        const { data: racks } = await supabase.from('racks').select('id').eq('room_id', id);
        if (racks && racks.length > 0) {
            const rackIds = racks.map(r => r.id);
            const { data: occupiedSlots } = await supabase
                .from('server_slots')
                .select('id')
                .in('rack_id', rackIds)
                .in('status', ['occupied', 'reserved'])
                .limit(1);
                
            if (occupiedSlots && occupiedSlots.length > 0) {
                return NextResponse.json({ error: 'Cannot delete room with occupied or reserved slots' }, { status: 400 });
            }
        }

        const { error } = await supabase.from('rooms').delete().eq('id', id);
        if (error) throw error;
        return NextResponse.json({ success: true });
      }

      case 'reorder': {
        const { data_center_id, room_ids } = data; // room_ids is an ordered array
        
        for (let i = 0; i < room_ids.length; i++) {
            await supabase
                .from('rooms')
                .update({ display_order: i })
                .eq('id', room_ids[i])
                .eq('data_center_id', data_center_id);
        }
        
        return NextResponse.json({ success: true });
      }

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error: any) {
    console.error('Rooms API Error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
