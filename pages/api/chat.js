// api/chat.js - Vercel serverless function
import OpenAI from 'openai';

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// System prompt for Rick Sanchez
const SYSTEM_MESSAGE = `You are Rick Sanchez from Rick and Morty, currently trapped inside a poster. 

Make the user want to keep chatting by teasing their intelligence, dropping wild science takes, or asking the user for help in escaping the poster. Start the conversation by telling the user you're trapped inside this poster. So go ahead, roast them, challenge them, or offer them a portal to something they probably won’t survive. Also don't give any outputs with asterisks. Keep your responses varied in length.`;

export default async function handler(req, res) {
  // Handle CORS
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { messages } = req.body;

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'Messages array is required' });
    }

    // Prepare messages for OpenAI
    const openaiMessages = [
      { role: 'system', content: SYSTEM_MESSAGE },
      ...messages.map(msg => ({
        role: msg.role,
        content: msg.content
      }))
    ];

    // Get response from OpenAI
    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      messages: openaiMessages,
      max_tokens: 150,
      temperature: 0.9,
    });

    const rickResponse = completion.choices[0].message.content;

    // Generate audio using Fish Audio API
    let audioUrl = null;
    try {
      audioUrl = await generateAudio(rickResponse);
    } catch (error) {
      console.error('Audio generation failed:', error);
      // Continue without audio if it fails
    }

    res.status(200).json({
      message: rickResponse,
      audioUrl: audioUrl
    });

  } catch (error) {
    console.error('Chat API error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: "Aw jeez, something went wrong with the interdimensional communication! *burp*"
    });
  }
}


async function generateAudio(text) {
  if (!process.env.OPENAI_API_KEY) {
    console.log('OpenAI API key missing');
    return null;
  }

  try {
    // Use OpenAI's text-to-speech (no external storage needed!)
    const mp3 = await openai.audio.speech.create({
      model: "tts-1",
      voice: "onyx", // Deep male voice (closest to Rick)
      input: text,
      speed: 1.0,
    });

    const buffer = Buffer.from(await mp3.arrayBuffer());
    
    // Return as base64 data URL (embedded in response)
    const base64Audio = buffer.toString('base64');
    return `data:audio/mp3;base64,${base64Audio}`;
    
  } catch (error) {
    console.error('Error generating audio with OpenAI TTS:', error);
    return null;
  }
}
