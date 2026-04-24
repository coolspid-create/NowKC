import { NextResponse } from 'next/server';

const API_KEY = process.env.RECALL_HUB_API_KEY;
const API_URL = process.env.RECALL_HUB_API_URL || 'https://recall-hub-admin-dev.vercel.app/api/v1';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    
    const url = new URL(`${API_URL}/stats`);
    
    // Forward supported query params
    const forwardParams = ['date_from', 'date_to', 'source'];
    forwardParams.forEach(param => {
      const value = searchParams.get(param);
      if (value) url.searchParams.set(param, value);
    });

    const res = await fetch(url.toString(), {
      headers: { 'X-API-Key': API_KEY },
      next: { revalidate: 300 }, // Cache for 5 minutes
    });

    if (!res.ok) {
      const errorText = await res.text();
      console.error('Recall Hub stats API error:', res.status, errorText);
      return NextResponse.json(
        { success: false, error: `API returned ${res.status}` },
        { status: res.status }
      );
    }

    const data = await res.json();
    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Recall stats proxy error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
