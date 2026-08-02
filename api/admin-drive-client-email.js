const SECRET="qMOHk10-rIzF8qZTCClw5reN5BMbvgJh";
export default function handler(req,res){res.setHeader("Cache-Control","no-store");if(req.method!=="GET")return res.status(405).json({ok:false});if(String(req.query?.token||"")!==SECRET)return res.status(403).json({ok:false});return res.status(200).json({ok:true,email:process.env.DRIVE_CLIENT_EMAIL||""});}
