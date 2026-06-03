import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(req: Request) {
  const { action, ...data } = await req.json();

  if (action === 'login') {
    const { email, password } = data;
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .eq('password', password)
      .maybeSingle();

    if (error || !user) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
    }
    if (user.approval_status === 'pending') {
      return NextResponse.json({ error: 'pending', message: 'Your account is awaiting admin approval.' }, { status: 403 });
    }
    if (user.approval_status === 'rejected') {
      return NextResponse.json({ error: 'rejected', message: 'Your account registration was rejected.' }, { status: 403 });
    }
    if (user.approval_status === 'suspended') {
      return NextResponse.json({ error: 'suspended', message: 'Your account has been suspended.' }, { status: 403 });
    }
    return NextResponse.json({ user });
  }

  if (action === 'register') {
    const { error } = await supabase.from('users').insert([{
      email: data.email,
      password: data.password,
      role: 'client',
      client_type: data.client_type,
      approval_status: 'pending',
      full_name: data.full_name,
      company_name: data.company_name ?? null,
      contact_person: data.contact_person ?? null,
      organization_type: data.organization_type ?? null,
      business_category: data.business_category ?? null,
      country: data.country ?? null,
      region: data.region ?? null,
      phone: data.phone ?? null,
      intended_usage: data.intended_usage ?? null,
      preferred_dc_region: data.preferred_dc_region ?? null,
      estimated_server_needs: data.estimated_server_needs ?? null,
      expected_server_count: data.expected_server_count ?? null,
      billing_preference: data.billing_preference ?? 'monthly',
    }]);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ success: true });
  }

  if (action === 'approve') {
    const { userId, adminId } = data;
    const { error } = await supabase.from('users').update({
      approval_status: 'approved',
      approved_by: adminId,
      approved_at: new Date().toISOString(),
    }).eq('id', userId);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ success: true });
  }

  if (action === 'reject') {
    const { userId } = data;
    const { error } = await supabase.from('users').update({ approval_status: 'rejected' }).eq('id', userId);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ success: true });
  }

  if (action === 'suspend') {
    const { userId } = data;
    const { error } = await supabase.from('users').update({ approval_status: 'suspended' }).eq('id', userId);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ success: true });
  }

  if (action === 'promote') {
    const { userId } = data;
    const { error } = await supabase.from('users').update({ role: 'admin', approval_status: 'approved' }).eq('id', userId);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ success: true });
  }

  if (action === 'list_pending') {
    const { data: users, error } = await supabase.from('users').select('*').eq('approval_status', 'pending').order('created_at', { ascending: false });
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ users });
  }

  if (action === 'list_all') {
    const { data: users, error } = await supabase.from('users').select('*').neq('role', 'admin').order('created_at', { ascending: false });
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ users });
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
}
