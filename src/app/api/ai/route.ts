import { NextResponse } from 'next/server';
import Groq from 'groq-sdk';

// Instantiate lazily inside the handler to prevent build errors on Vercel if GROQ_API_KEY is missing during build time.
let groq: Groq | null = null;

export async function POST(req: Request) {
  try {
    if (!groq) {
      // Allow fallback if no API key is provided
      if (!process.env.GROQ_API_KEY) {
        // We'll mock the response if no key is available
      } else {
        groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
      }
    }

    const { systemType, context, prompt } = await req.json();

    if (!systemType || !prompt) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    let systemPrompt = '';
    
    // We can use either llama-3.3-70b-versatile or llama-3.1-8b-instant based on availability.
    // Llama 3.3 70B is very capable for complex reasoning.
    const model = 'llama-3.3-70b-versatile'; 

    switch (systemType) {
      case 'Traffic Optimizer':
        systemPrompt = `You are the Vayu Traffic Optimizer AI. Your job is to analyze global data center load and suggest realistic routing changes to optimize traffic.
Use technical terms like BGP Anycast, DNS Weighted Routing, Edge Caching, and CDN offloading.
Respond in JSON format with two keys: "decision" (a specific technical action, e.g. "Shift 40% traffic via DNS weighted routing to EU-Central") and "explanation" (detailed technical reasoning).`;
        break;
      case 'Threat Defense':
        systemPrompt = `You are the Vayu Security Defense AI. Your job is to analyze traffic anomalies and detect attacks.
Use technical terms like IP Blacklisting, BGP Null Routing (Blackholing), Rate Limiting (Token Bucket), WAF rule deployments, and Deep Packet Inspection (DPI).
Respond in JSON format with two keys: "decision" (a specific technical action, e.g. "Deploy BGP Null Route and activate WAF aggressive mode") and "explanation" (detailed technical reasoning).`;
        break;
      case 'Allocation':
        systemPrompt = `You are the Vayu Data Center Allocation AI. Your job is to determine optimal server placement across racks.
Use technical terms like kW/rack power density, BTU cooling capacity, Hot/Cold Aisle containment, and Top-of-Rack (ToR) switch port availability.
Respond in JSON format with two keys: "decision" (a specific technical action, e.g. "Provision across Rack 2 & 3 to maintain < 15kW density") and "explanation" (detailed technical reasoning).`;
        break;
      case 'Cost Efficiency':
        systemPrompt = `You are the Vayu Cost Efficiency AI. Your job is to detect underutilized resources and recommend consolidation.
Use technical terms like VM Live Migration, Hypervisor consolidation, PUE (Power Usage Effectiveness) optimization, and dynamic power capping.
Respond in JSON format with two keys: "decision" (a specific technical action, e.g. "Initiate live migration of 50 idle VMs to core cluster and power down Edge nodes") and "explanation" (detailed technical reasoning).`;
        break;
      default:
        systemPrompt = 'You are the Vayu AI Assistant.';
    }

    const completion = await groq.chat.completions.create({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Context: ${JSON.stringify(context)}\n\nQuery: ${prompt}` }
      ],
      model: model,
      response_format: { type: 'json_object' },
    });

    const content = completion.choices[0]?.message?.content || '{}';
    const jsonResponse = JSON.parse(content);

    return NextResponse.json({
      decision: jsonResponse.decision || 'No decision made',
      explanation: jsonResponse.explanation || 'No explanation provided',
      confidence: (Math.random() * 20 + 80).toFixed(1), // Mock confidence between 80-100%
      raw_content: content
    });

  } catch (error) {
    console.error('Groq API Error:', error);
    return NextResponse.json({ error: 'Failed to generate AI response' }, { status: 500 });
  }
}
