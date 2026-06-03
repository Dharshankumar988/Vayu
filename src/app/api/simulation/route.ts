import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(req: Request) {
  const { action, ...data } = await req.json();

  if (action === 'trigger_ddos') {
    const { dc_id, severity, started_by } = data;
    const { data: result, error } = await supabase.from('threat_simulations').insert([{
      data_center_id: dc_id,
      sim_type: 'ddos_attack',
      severity,
      started_by,
      is_active: true,
    }]).select().maybeSingle();
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    // Log it
    await supabase.from('operational_logs').insert([{
      category: 'threat',
      event_type: 'ddos_simulation_started',
      message: `DDoS simulation (${severity}) triggered on data center`,
      severity: severity === 'critical' ? 'critical' : 'warning',
      metadata: { dc_id, severity },
      user_id: started_by,
      dc_id,
    }]);
    return NextResponse.json({ success: true, event_id: result?.id });
  }

  if (action === 'trigger_damage') {
    const { dc_id, damage_type, started_by } = data;
    const { data: result, error } = await supabase.from('threat_simulations').insert([{
      data_center_id: dc_id,
      sim_type: 'physical_damage',
      severity: 'critical',
      damage_type,
      started_by,
      is_active: true,
    }]).select().maybeSingle();
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    await supabase.from('operational_logs').insert([{
      category: 'allocation',
      event_type: 'physical_damage_simulation',
      message: `Physical damage simulation (${damage_type}) triggered on data center`,
      severity: 'critical',
      metadata: { dc_id, damage_type },
      user_id: started_by,
      dc_id,
    }]);
    return NextResponse.json({ success: true, event_id: result?.id });
  }

  if (action === 'trigger_load') {
    const { region, multiplier, started_by } = data;
    const { data: result, error } = await supabase.from('traffic_simulations').insert([{
      region,
      load_multiplier: multiplier,
      started_by,
      is_active: true,
    }]).select().maybeSingle();
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    await supabase.from('operational_logs').insert([{
      category: 'traffic',
      event_type: 'load_increase_simulation',
      message: `Load increase simulation (${multiplier}x) triggered in ${region}`,
      severity: multiplier > 5 ? 'warning' : 'info',
      metadata: { region, multiplier },
      user_id: started_by,
    }]);
    return NextResponse.json({ success: true, event_id: result?.id });
  }

  if (action === 'resolve') {
    const { event_id, table } = data;
    const tableName = table === 'traffic' ? 'traffic_simulations' : 'threat_simulations';
    const { error } = await supabase.from(tableName).update({ is_active: false, ended_at: new Date().toISOString() }).eq('id', event_id);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ success: true });
  }

  if (action === 'get_logs') {
    const { category, limit = 50 } = data;
    const query = supabase.from('operational_logs').select('*').order('created_at', { ascending: false }).limit(limit);
    if (category) query.eq('category', category);
    const { data: logs, error } = await query;
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ logs });
  }

  if (action === 'get_ai_decisions') {
    const { data: decisions, error } = await supabase.from('ai_decisions').select('*').order('created_at', { ascending: false }).limit(100);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ decisions });
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
}
