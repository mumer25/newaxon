// import QRCode from "qrcode";
// import { encrypt, signPayload } from "@/lib/encrypt";

// export async function POST(req: Request) {
//     try {
//         const body = await req.json();
//         const { entity_id } = body;

//         if (!entity_id) {
//             return new Response(
//                 JSON.stringify({ error: "entity_id is required" }),
//                 { status: 400, headers: { "Content-Type": "application/json" } }
//             );
//         }

//         // Determine base URL dynamically (includes subdomain)
//         const baseUrl = req.headers.get("origin");

//         const payload = {
//             entity_id,
//             baseUrl, // Add the base URL
//             sync_url: "api/sync",
//             check_connection_url: "api/check-connection",
//             generated_at: new Date().toISOString(),
//         };

//         const payloadStr = JSON.stringify(payload);

//         // Sign payload
//         const signature = signPayload(payloadStr);

//         // Add signature and encrypt
//         const finalPayload = { ...payload, signature };
//         const encryptedPayload = encrypt(JSON.stringify(finalPayload));

//         // Generate QR code
//         const qrCodeDataUrl = await QRCode.toDataURL(encryptedPayload);

//         const response = { 
//             qrCode: qrCodeDataUrl,
//             baseUrl // Send baseUrl separately in response
//         };
//         console.log("Response:", response);

//         return new Response(
//             JSON.stringify(response),
//             { status: 200, headers: { "Content-Type": "application/json" } }
            
//         );
        
//     } catch (err) {
//         console.error(err);
//         return new Response(
//             JSON.stringify({ error: "Failed to generate QR code" }),
//             { status: 500, headers: { "Content-Type": "application/json" } }
//         );
//     }
// }









