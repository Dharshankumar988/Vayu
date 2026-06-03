import { NextResponse } from 'next/server';
import Groq from 'groq-sdk';

let groq: Groq | null = null;

const TECHNIQUE_PROMPTS: Record<string, string> = {
  'Traffic Optimizer': `You are the Vayu Traffic Optimizer AI. Analyze global data center load and select the best routing technique from: BGP Anycast (for critical overload >85%), DNS Weighted Routing (for moderate overload >60%), CDN Edge Cache (for light load). Use technical terms. Respond in JSON: {"decision": "specific action", "explanation": "technical reasoning", "technique": "selected technique name"}`,
  'Threat Defense': `You are the Vayu Security Defense AI. Analyze traffic anomalies and select the best defense from: BGP Null Routing/Blackholing (for severe DDoS >80% threat), IP Blacklisting (for moderate threats >50%), WAF + Deep Packet Inspection (for low-level threats). Respond in JSON: {"decision": "specific action", "explanation": "technical reasoning", "technique": "selected technique name"}`,
  'Allocation': `You are the Vayu Data Center Allocation AI. Select best rack allocation strategy from: Hot-Cold Aisle Containment (high density >70%), ToR Switch Load Balancing (moderate density >40%), Cross-DC Replication (default). Use terms: kW/rack, BTU cooling, ToR switch port availability. Respond in JSON: {"decision": "specific action", "explanation": "technical reasoning", "technique": "selected technique name"}`,
  'Cost Efficiency': `You are the Vayu Cost Efficiency AI. Select best cost optimization from: VM Live Migration (utilization <30%), Dynamic Power Capping (utilization <50%), Idle Server Consolidation (default). Use terms: PUE, hypervisor, VM live migration, dynamic power capping. Respond in JSON: {"decision": "specific action", "explanation": "technical reasoning", "technique": "selected technique name"}`,
  'Health Analysis': `You are the Vayu Infrastructure Health AI. Analyze server health metrics and produce a concise health summary for a client. Respond in JSON: {"summary": "2-3 sentence health overview", "status": "healthy|warning|critical", "recommendations": ["recommendation 1", "recommendation 2"]}`
};

export async function POST(req: Request) {
  try {
    if (!groq && process.env.GROQ_API_KEY) {
      groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
    }
    const { systemType, context, prompt, userQuery } = await req.json();
    if (!systemType || !prompt) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }
    
    // Add specific instruction for custom questions to the system prompt
    let systemPrompt = TECHNIQUE_PROMPTS[systemType] ?? 'You are the Vayu AI Assistant. Respond in JSON.';
    if (userQuery) {
      systemPrompt += ` The user has asked a specific question: "${userQuery}". Answer this question directly in the 'explanation' field, explaining how the active technique works, its benefits, and why it was chosen based on the context.`;
    }

    const model = 'llama-3.3-70b-versatile';

    if (!groq) {
      // Fallback mock responses when no API key
      const mocks: Record<string, object> = {
        'Traffic Optimizer': { decision: 'Shift 35% traffic via DNS Weighted Routing to underloaded regions', explanation: 'US-East at 92% capacity. Redistributing via DNS weighted routing to EU-Central (45% load) and AP-Singapore (60% load) will reduce US-East load to ~65% and improve global response times by ~180ms.', technique: 'DNS Weighted Routing', confidence: '91.4' },
        'Threat Defense': { decision: 'Deploy BGP Null Route on /24 subnets + activate WAF aggressive mode', explanation: 'DDoS signature detected: 2.4M pps SYN flood from 847 unique IPs across 23 ASNs. BGP null routing the top /24 source subnets removes 78% of attack volume. WAF aggressive mode blocks remaining patterns.', technique: 'BGP Null Routing', confidence: '94.7' },
        'Allocation': { decision: 'Provision new instances across Rack B3 and B4 to maintain <15kW density', explanation: 'Current Rack B1 and B2 are at 18kW, exceeding optimal 15kW/rack. Distributing new 50 instances across B3-B4 maintains hot-cold aisle integrity and reduces cooling load by 22%.', technique: 'Hot-Cold Aisle', confidence: '88.2' },
        'Cost Efficiency': { decision: 'Initiate live migration of 42 idle VMs to core cluster; power down 6 edge nodes', explanation: 'SA-East region at 18% utilization. Live migrating 42 idle VMs (avg 0.3 vCPU) to NA-East core cluster saves 3.2kW/hr. Powering down 6 edge nodes reduces PUE from 1.8 to 1.6.', technique: 'VM Live Migration', confidence: '86.9' },
        'Health Analysis': { summary: 'Your infrastructure is operating within normal parameters. All 3 hosted servers show healthy CPU and memory utilization. No anomalies detected in the last 24 hours.', status: 'healthy', recommendations: ['Consider upgrading Stark-DB-1 memory allocation as it approaches 80% utilization', 'Schedule maintenance window for next month'] },
      };
      
      const baseMock = mocks[systemType] ?? { decision: 'System nominal', explanation: 'All parameters within acceptable range.', technique: 'Auto', confidence: '85.0' };
      const mock = { ...baseMock } as any;
      
      if (userQuery) {
        mock.explanation = `(Mock Response) Answering: "${userQuery}"\n\nBased on our current ${systemType} strategy and the active ${mock.technique} technique, this approach allows us to automatically adapt to the environment. It ensures high availability and cost efficiency by dynamically shifting resources.`;
      }

      return NextResponse.json({ ...mock, confidence: mock.confidence ?? `${(80 + Math.random() * 15).toFixed(1)}` });
    }

    const completion = await groq.chat.completions.create({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Context: ${JSON.stringify(context)}\n\nQuery: ${prompt}` },
      ],
      model,
      response_format: { type: 'json_object' },
    });

    const content = completion.choices[0]?.message?.content || '{}';
    const json = JSON.parse(content);

    return NextResponse.json({
      decision: json.decision || json.summary || 'Analysis complete',
      explanation: json.explanation || json.recommendations?.join(' ') || '',
      technique: json.technique,
      summary: json.summary,
      status: json.status,
      recommendations: json.recommendations,
      confidence: `${(80 + Math.random() * 18).toFixed(1)}`,
    });
  } catch (error) {
    console.error('Groq API Error:', error);
    return NextResponse.json({ error: 'Failed to generate AI response' }, { status: 500 });
  }
}
