/**
 * 孤立スロット削除スクリプト
 * reservations に紐づかない slots ドキュメントのみを削除する
 *
 * 実行方法（functions/ ディレクトリから）:
 *   node delete-orphan-slots.js
 */

const admin = require('firebase-admin');

admin.initializeApp({
    projectId: 'project-3040e21e-879f-4c66-a7d',
    credential: admin.credential.applicationDefault(),
});

const db = admin.firestore();

async function deleteOrphanSlots() {
    // 1. reservations から有効なスロットID一覧を収集
    const resSnap = await db.collection('reservations').get();
    const validSlotIds = new Set(
        resSnap.docs
            .map(d => {
                const { date, time } = d.data();
                return date && time ? `${date}_${time.replace(':', '')}` : null;
            })
            .filter(Boolean)
    );
    console.log(`📋 有効な予約: ${resSnap.size} 件 → スロットID: ${[...validSlotIds].join(', ')}`);

    // 2. slots を全件取得
    const slotsSnap = await db.collection('slots').get();
    console.log(`🗂️  slots 総数: ${slotsSnap.size} 件`);

    // 3. 孤立スロットを抽出
    const orphans = slotsSnap.docs.filter(d => !validSlotIds.has(d.id));
    console.log(`🗑️  削除対象（孤立スロット）: ${orphans.length} 件`);

    if (orphans.length === 0) {
        console.log('削除対象なし。終了します。');
        return;
    }

    // 4. バッチ削除
    const batch = db.batch();
    orphans.forEach(d => {
        console.log(`  - ${d.id}`);
        batch.delete(d.ref);
    });
    await batch.commit();

    console.log('✅ 削除完了。');
}

deleteOrphanSlots().catch(e => {
    console.error('エラー:', e.message);
    process.exit(1);
});
