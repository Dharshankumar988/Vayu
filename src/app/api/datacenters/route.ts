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
        // Fetch all Data Centers
        const { data: dcs, error: dcsError } = await supabase
          .from('data_centers')
          .select('*')
          .order('created_at', { ascending: true });
        
        if (dcsError) throw dcsError;

        if (!dcs || dcs.length === 0) {
            return NextResponse.json({ data: [] });
        }

        const dcIds = dcs.map(dc => dc.id);

        // Fetch all Rooms for these DCs
        const { data: rooms, error: roomsError } = await supabase
          .from('rooms')
          .select('*')
          .in('data_center_id', dcIds)
          .order('display_order', { ascending: true });

        if (roomsError) throw roomsError;

        const roomIds = (rooms || []).map(r => r.id);

        // Fetch all Racks for these Rooms
        const { data: racks, error: racksError } = await supabase
          .from('racks')
          .select('*')
          .in('room_id', roomIds.length > 0 ? roomIds : ['00000000-0000-0000-0000-000000000000'])
          .order('display_order', { ascending: true });

        if (racksError) throw racksError;

        const rackIds = (racks || []).map(rk => rk.id);

        // Fetch all Slots for these Racks, and join with Users to get client names
        // Since we are using standard supabase js, and left join might require explicit foreign key config, 
        // we'll fetch slots and then users separately or use supabase join syntax if configured.
        // Assuming schema has proper FK:
        const { data: slots, error: slotsError } = await supabase
          .from('server_slots')
          .select('*, users!server_slots_client_id_fkey(full_name)')
          .in('rack_id', rackIds.length > 0 ? rackIds : ['00000000-0000-0000-0000-000000000000'])
          .order('position', { ascending: true });

        // If the above join fails due to fk naming, we can do it manually or simply use the relation name.
        // In schema.sql it's: client_id UUID REFERENCES public.users(id)
        // Let's just do a manual fetch of users to be safe if join is tricky.
        let safeSlots = slots || [];
        if (slotsError) {
           const { data: fallbackSlots, error: fbError } = await supabase
            .from('server_slots')
            .select('*')
            .in('rack_id', rackIds.length > 0 ? rackIds : ['00000000-0000-0000-0000-000000000000'])
            .order('position', { ascending: true });
            
            if(fbError) throw fbError;
            safeSlots = fallbackSlots || [];
        }

        // Fetch users for client names
        const clientIds = [...new Set(safeSlots.map(s => s.client_id).filter(Boolean))];
        let usersMap: Record<string, string> = {};
        if (clientIds.length > 0) {
            const { data: users } = await supabase.from('users').select('id, full_name').in('id', clientIds);
            if (users) {
                users.forEach(u => usersMap[u.id] = u.full_name);
            }
        }

        // Assemble the nested structure
        const result = dcs.map(dc => {
          const dcRooms = (rooms || []).filter(r => r.data_center_id === dc.id).map(room => {
            const roomRacks = (racks || []).filter(rk => rk.room_id === room.id).map(rack => {
              const rackSlots = safeSlots.filter(s => s.rack_id === rack.id).map(slot => ({
                ...slot,
                client_name: slot.users?.full_name || usersMap[slot.client_id] || null
              }));
              return { ...rack, slots: rackSlots };
            });
            return { ...room, racks: roomRacks };
          });
          return { ...dc, rooms: dcRooms };
        });

        return NextResponse.json({ data: result });
      }

      case 'get': {
        // Implementation similar to list but filtered by id
        const { id } = data;
        const { data: dc, error: dcError } = await supabase.from('data_centers').select('*').eq('id', id).single();
        if (dcError) throw dcError;
        
        // ... (simplified for now, full implementation would fetch nested data)
        return NextResponse.json({ data: dc });
      }

      case 'create': {
        const { name, location, region, lat, lng, total_capacity, created_by, price_per_slot_month, numRooms = 1, racksPerRoom = 4 } = data;
        
        // 1. Create DC
        const { data: dc, error: dcError } = await supabase
          .from('data_centers')
          .insert({ name, location, region, lat, lng, total_capacity, created_by, price_per_slot_month })
          .select()
          .single();
        if (dcError) throw dcError;

        // 2. Create Rooms based on numRooms
        const roomsToInsert = Array.from({ length: numRooms }).map((_, i) => ({
            data_center_id: dc.id,
            name: `Room ${String.fromCharCode(65 + i)}`,
            display_order: i
        }));
        const { data: insertedRooms, error: roomsError } = await supabase
          .from('rooms')
          .insert(roomsToInsert)
          .select();
        if (roomsError) throw roomsError;

        // 3. Create racks for each room based on racksPerRoom
        const racksToInsert = [];
        for (let rIndex = 0; rIndex < insertedRooms.length; rIndex++) {
            const room = insertedRooms[rIndex];
            const roomLetter = String.fromCharCode(65 + rIndex);
            for (let i = 0; i < racksPerRoom; i++) {
                racksToInsert.push({
                    room_id: room.id,
                    name: `Rack ${roomLetter}-${i + 1}`,
                    display_order: i
                });
            }
        }
        
        const { data: insertedRacks, error: racksError } = await supabase
            .from('racks')
            .insert(racksToInsert)
            .select();
        if (racksError) throw racksError;

        // 4. Create 4 slots for each rack
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
        
        const { error: slotsError } = await supabase.from('server_slots').insert(slotsToInsert);
        if (slotsError) throw slotsError;

        return NextResponse.json({ data: dc });
      }

      case 'update': {
        const { id, ...updateFields } = data;
        const { data: dc, error } = await supabase
          .from('data_centers')
          .update(updateFields)
          .eq('id', id)
          .select()
          .single();
        if (error) throw error;
        return NextResponse.json({ data: dc });
      }

      case 'delete': {
        const { id } = data;
        const { error } = await supabase.from('data_centers').delete().eq('id', id);
        if (error) throw error;
        return NextResponse.json({ success: true });
      }

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error: any) {
    console.error('API Error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
