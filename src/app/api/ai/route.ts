import { NextResponse } from 'next/server';
import Groq from 'groq-sdk';

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

export async function POST(req: Request) {
  try {
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
        systemPrompt = `You are the Vayu Traffic Optimizer AI. Your job is to analyze global data center load and suggest routing changes to optimize traffic and prevent congestion. 
Respond in JSON format with two keys: "decision" (a short summary of the action to take) and "explanation" (detailed reasoning).`;
        break;
      case 'Threat Defense':
        systemPrompt = `You are the Vayu Security Defense AI. Your job is to analyze traffic anomalies and detect potential attacks (e.g., DDoS). 
Respond in JSON format with two keys: "decision" (a short summary of the containment action) and "explanation" (detailed reasoning).`;
        break;
      case 'Allocation':
        systemPrompt = `You are the Vayu Data Center Allocation AI. Your job is to determine optimal server placement across racks to maximize capacity and cooling efficiency.
Respond in JSON format with two keys: "decision" (a short summary of the placement) and "explanation" (detailed reasoning).`;
        break;
      case 'Cost Efficiency':
        systemPrompt = `You are the Vayu Cost Efficiency AI. Your job is to detect underutilized resources and recommend consolidation strategies.
Respond in JSON format with two keys: "decision" (a short summary of the optimization) and "explanation" (detailed reasoning).`;
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
