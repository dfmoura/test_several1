import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    status: "ok",
    service: "reta-erp",
    time: new Date().toISOString(),
  });
}
