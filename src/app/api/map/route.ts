import mysql from "mysql2/promise";

export async function GET() {
  try {
    const db = await mysql.createConnection({
      host: "localhost",
      user: "root",
      password: "",
      database: "db_map_jaringan",
    });

    const [tiang]: any = await db.execute(`
      SELECT id, latitude, longitude,
      IFNULL(penyulang,'-') as penyulang
      FROM tiang
    `);

    const [nodes]: any = await db.execute(`
      SELECT id, latitude, longitude, kategori,
      IFNULL(keypoint,'-') as keypoint,
      IFNULL(penyulang,'-') as penyulang
      FROM nodes
    `);

    const [gardu]: any = await db.execute(`
      SELECT id, nama_gardu, latitude, longitude,
      IFNULL(penyulang,'-') as penyulang
      FROM gardu
    `);

    return Response.json({
      tiang: tiang || [],
      nodes: nodes || [],
      gardu: gardu || [],
    });

  } catch (err) {
    console.error("API ERROR:", err);

    return Response.json(
      { error: "Gagal ambil data map" },
      { status: 500 }
    );
  }
}