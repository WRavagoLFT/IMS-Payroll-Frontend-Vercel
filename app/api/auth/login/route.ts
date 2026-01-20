import { NextResponse } from "next/server";

export async function POST(req: Request) {
  //console.log("[LOGIN] Incoming POST request...");

  try {
    const body = await req.json();
    //console.log("[LOGIN] Request body received:", body);

    const backendUrl = `${process.env.NEXT_PUBLIC_API_URL}/auth/login`;
    //console.log("[LOGIN] Backend URL:", backendUrl);

    const res = await fetch(backendUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      credentials: "include",
    });

    //console.log("[LOGIN] Backend response status:", res.status);

    const text = await res.text();
    //console.log("[LOGIN] Raw backend response text:", text);

    let data;
    try {
      data = JSON.parse(text);
      //console.log("[LOGIN] Parsed backend JSON:", data);
    } catch (err) {
      console.error("[LOGIN] Failed to parse backend JSON:", err);
      return NextResponse.json(
        { success: false, message: "Invalid backend JSON response." },
        { status: 500 }
      );
    }

    if (res.ok) {
      //console.log("[LOGIN] Backend login successful.");

      const response = NextResponse.json({
        success: true,
        message: "Login successful",
        user: data?.user || data?.username || data.null,
      });

      response.cookies.set(
        "session",
        JSON.stringify({
          isAuthenticated: true,
          userType: data?.data?.userType,
          email: data?.data?.email,
          token: data?.data?.token, // optional
        }),
        {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "lax",
          path: "/",
          maxAge: 60 * 60, // 1 hour
        }
      );

      //console.log("[LOGIN] HTTP-only cookie set. Returning success response...");
      return response;
    }

    //console.warn("[LOGIN] Backend login failed:", data?.message || "Unauthorized");
    return NextResponse.json(
      { success: false, message: data?.message || "Invalid credentials" },
      { status: res.status }
    );
  } catch (error) {
    console.error("[LOGIN] Unexpected error:", error);
    return NextResponse.json(
      { success: false, message: "Server error during login." },
      { status: 500 }
    );
  }
}
