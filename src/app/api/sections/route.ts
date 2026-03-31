import mysql from "mysql2/promise";

const dbConfig = { host: "localhost", user: "root", password: "", database: "db_map_jaringan" };

export async function GET() {
    try {
        const db = await mysql.createConnection(dbConfig);
        const [rows]: any = await db.execute(`SELECT * FROM sections ORDER BY created_at DESC`);
        await db.end();
        return Response.json({ sections: rows });
    } catch (err) {
        console.error(err);
        return Response.json({ error: "Gagal ambil sections" }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const { nama_section: nama_input, penyulang, panjang_section, points, segments } = await req.json();
        if (!points || points.length < 3) return Response.json({ error: "Minimal 3 titik untuk menentukan alur section" }, { status: 400 });

        const db = await mysql.createConnection(dbConfig);
        const start = points[0], end = points[points.length - 1];
        const nama_section = nama_input?.trim() || `${start.keypoint || "Titik"} - ${end.keypoint || "Titik"}`;
        const jumlah_tiang = points.filter((p: any) => p.type === "tiang").length;
        const jumlah_gardu = points.filter((p: any) => p.type === "gardu").length;
        let waypointsArr: any[];
        if (segments && segments.length > 0) {
            waypointsArr = [];
            segments.forEach((seg: any[], si: number) => {
                if (si > 0) waypointsArr.push(null);
                seg.forEach((p: any) => waypointsArr.push([p.latitude, p.longitude]));
            });
        } else {
            waypointsArr = points.map((p: any) => [p.latitude, p.longitude]);
        }
        const waypoints = JSON.stringify(waypointsArr);
        const point_ids = JSON.stringify(points.map((p: any) => ({ id: p.id, type: p.type })));

        await db.execute(
            `INSERT INTO sections (nama_section,penyulang,panjang_section,jumlah_tiang,jumlah_gardu,titik_awal_lat,titik_awal_lng,titik_akhir_lat,titik_akhir_lng,waypoints,point_ids) VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
            [nama_section, penyulang || null, panjang_section || 0, jumlah_tiang, jumlah_gardu, start.latitude, start.longitude, end.latitude, end.longitude, waypoints, point_ids]
        );

        // Update penyulang semua titik yang masuk section
        const tiangIds = points.filter((p:any) => p.type === "tiang").map((p:any) => p.id);
        const garduIds = points.filter((p:any) => p.type === "gardu").map((p:any) => p.id);
        const nodeIds = points.filter((p:any) => !["tiang","gardu"].includes(p.type)).map((p:any) => p.id);
        if (tiangIds.length > 0) await db.execute(`UPDATE tiang SET penyulang = ? WHERE id IN (${tiangIds.map(()=>'?').join(',')})`, [penyulang, ...tiangIds]);
        if (garduIds.length > 0) await db.execute(`UPDATE gardu SET penyulang = ? WHERE id IN (${garduIds.map(()=>'?').join(',')})`, [penyulang, ...garduIds]);
        if (nodeIds.length > 0) await db.execute(`UPDATE nodes SET penyulang = ? WHERE id IN (${nodeIds.map(()=>'?').join(',')})`, [penyulang, ...nodeIds]);

        await db.end();
        return Response.json({ success: true });
    } catch (err) {
        console.error(err);
        return Response.json({ error: "Gagal simpan section" }, { status: 500 });
    }
}

export async function PUT(req: Request) {
    try {
        const { id, nama_section, penyulang, panjang_section, points, segments } = await req.json();
        if (!id) return Response.json({ error: "ID wajib" }, { status: 400 });

        const db = await mysql.createConnection(dbConfig);

        if (points && points.length >= 2) {
            const start = points[0], end = points[points.length - 1];
            const jumlah_tiang = points.filter((p: any) => p.type === "tiang").length;
            const jumlah_gardu = points.filter((p: any) => p.type === "gardu").length;

            let waypointsArr: any[];
            if (segments && segments.length > 0) {
                waypointsArr = [];
                segments.forEach((seg: any[], si: number) => {
                    if (si > 0) waypointsArr.push(null);
                    seg.forEach((p: any) => waypointsArr.push([p.latitude, p.longitude]));
                });
            } else {
                waypointsArr = points.map((p: any) => [p.latitude, p.longitude]);
            }

            const waypoints = JSON.stringify(waypointsArr);
            const point_ids = JSON.stringify(points.map((p: any) => ({ id: p.id, type: p.type })));
            await db.execute(
                `UPDATE sections SET nama_section=?, penyulang=?, panjang_section=?, jumlah_tiang=?, jumlah_gardu=?, titik_awal_lat=?, titik_awal_lng=?, titik_akhir_lat=?, titik_akhir_lng=?, waypoints=?, point_ids=? WHERE id=?`,
                [nama_section || null, penyulang || null, panjang_section || 0, jumlah_tiang, jumlah_gardu, start.latitude, start.longitude, end.latitude, end.longitude, waypoints, point_ids, id]
            );

            // Update penyulang semua titik yang masuk section
            const tiangIds = points.filter((p:any) => p.type === "tiang").map((p:any) => p.id);
            const garduIds = points.filter((p:any) => p.type === "gardu").map((p:any) => p.id);
            const nodeIds = points.filter((p:any) => !["tiang","gardu"].includes(p.type)).map((p:any) => p.id);
            if (tiangIds.length > 0) await db.execute(`UPDATE tiang SET penyulang = ? WHERE id IN (${tiangIds.map(()=>'?').join(',')})`, [penyulang, ...tiangIds]);
            if (garduIds.length > 0) await db.execute(`UPDATE gardu SET penyulang = ? WHERE id IN (${garduIds.map(()=>'?').join(',')})`, [penyulang, ...garduIds]);
            if (nodeIds.length > 0) await db.execute(`UPDATE nodes SET penyulang = ? WHERE id IN (${nodeIds.map(()=>'?').join(',')})`, [penyulang, ...nodeIds]);
        } else {
            await db.execute(
                `UPDATE sections SET nama_section=?, penyulang=?, panjang_section=? WHERE id=?`,
                [nama_section || null, penyulang || null, panjang_section || 0, id]
            );
        }

        await db.end();
        return Response.json({ success: true });
    } catch (err) {
        console.error(err);
        return Response.json({ error: "Gagal update section" }, { status: 500 });
    }
}

export async function DELETE(req: Request) {
    try {
        const { id } = await req.json();
        if (!id) return Response.json({ error: "ID wajib" }, { status: 400 });

        const db = await mysql.createConnection(dbConfig);
        await db.execute(`DELETE FROM sections WHERE id=?`, [id]);
        await db.end();
        return Response.json({ success: true });
    } catch (err) {
        console.error(err);
        return Response.json({ error: "Gagal hapus section" }, { status: 500 });
    }
}