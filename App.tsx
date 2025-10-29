import React, { useEffect, useState } from 'react';
import { View, Text, Button, FlatList, StyleSheet, TextInput, Alert } from 'react-native';
import { initDatabase, getDB } from './db';
import * as SQLite from 'expo-sqlite';

export default function App() {
  const [db, setDb] = useState<SQLite.SQLiteDatabase | null>(null);
  const [items, setItems] = useState<any[]>([]);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [metadata, setMetadata] = useState('');
  const [tags, setTags] = useState('');

  useEffect(() => {
    (async () => {
      const database = await initDatabase();
      setDb(database);
      await loadItems(database);
    })();
  }, []);

  async function loadItems(database: SQLite.SQLiteDatabase) {
    const rows = await database.getAllAsync(`
      SELECT i.id, i.name, i.category, i.description,
             m.attributes AS metadata,
             GROUP_CONCAT(t.name, ',') AS tags
      FROM items i
      LEFT JOIN metadata m ON m.item_remote_id = i.id
      LEFT JOIN item_tags it ON it.item_remote_id = i.id
      LEFT JOIN tags t ON t.id = it.tag_remote_id
      GROUP BY i.id
      ORDER BY i.id DESC
    `);

    const formatted = rows.map((r: any) => {
      let metaObj = {};
      try {
        metaObj = r.metadata ? JSON.parse(r.metadata) : {};
      } catch {
        metaObj = {};
      }

      return {
        ...r,
        metadata: metaObj,
        tags: r.tags ? r.tags.split(',') : [],
      };
    });

    setItems(formatted);
  }

  async function addItem() {
    if (!db) return;

    if (!name || !description || !category) {
      Alert.alert('Error', 'Please fill in all fields.');
      return;
    }

    const now = Date.now();

    // Insert item
    const result = await db.runAsync(
      `INSERT INTO items (name, description, category, created_at, updated_at, pending_sync)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [name, description, category, now, now, 1]
    );

    const itemId = result.lastInsertRowId;

    // Insert metadata (one row per item)
    let metaId: number | null = null;
    if (metadata) {
      try {
        const metaJSON = JSON.stringify(
          Object.fromEntries(
            metadata.split(',')
              .map(pair => pair.split(':').map(s => s.trim()))
              .filter(([k, v]) => k && v)
          )
        );

        const metaResult = await db.runAsync(
          `INSERT INTO metadata (item_remote_id, attributes, created_at, updated_at, pending_sync)
           VALUES (?, ?, ?, ?, ?)`,
          [itemId, metaJSON, now, now, 1]
        );

        metaId = metaResult.lastInsertRowId;
      } catch (err) {
        console.error('Invalid metadata format', err);
      }
    }

    // Insert tags
    if (tags) {
      const tagList = tags.split(',').map(t => t.trim()).filter(t => t.length > 0);

      for (const tag of tagList) {
        // Optional: check if tag already exists
        const existingRows = await db.getAllAsync(
            `SELECT id FROM tags WHERE name = ?`,
            [tag]
          ) as { id: number }[];

          const existing = existingRows[0];
          let tagId: number;
          if (existing) {
            tagId = existing.id; // ✅ now TS is happy
          } else {
            const tagRes = await db.runAsync(
              `INSERT INTO tags (name, created_at, updated_at, pending_sync)
              VALUES (?, ?, ?, ?)`,
              [tag, now, now, 1]
            );
            tagId = tagRes.lastInsertRowId;
          }

        await db.runAsync(
          `INSERT INTO item_tags (item_remote_id, tag_remote_id, metadata_remote_id)
           VALUES (?, ?, ?)`,
          [itemId, tagId, metaId]
        );
      }
    }

    // Clear input
    setName('');
    setDescription('');
    setCategory('');
    setMetadata('');
    setTags('');

    await loadItems(db);
  }

  async function clearAll() {
  if (!db) return;
  try {
    // Disable foreign keys temporarily
    await db.runAsync(`PRAGMA foreign_keys = OFF`);

    // Drop all tables
    await db.runAsync(`DROP TABLE IF EXISTS item_images`);
    await db.runAsync(`DROP TABLE IF EXISTS item_tags`);
    await db.runAsync(`DROP TABLE IF EXISTS metadata`);
    await db.runAsync(`DROP TABLE IF EXISTS tags`);
    await db.runAsync(`DROP TABLE IF EXISTS items`);

    // Recreate tables fresh
    await initDatabase();

    // Refresh list
    await loadItems(db);
    Alert.alert('Cleared', 'All entries have been deleted.');
  } catch (err) {
    console.error('Error clearing DB:', err);
  }
}


  return (
    <View style={styles.container}>
      <Text style={styles.header}>SQLite Local DB</Text>

      <TextInput style={styles.input} placeholder="Item name" value={name} onChangeText={setName} />
      <TextInput style={styles.input} placeholder="Description" value={description} onChangeText={setDescription} />
      <TextInput style={styles.input} placeholder="Category" value={category} onChangeText={setCategory} />
      <TextInput
        style={styles.input}
        placeholder="Metadata (e.g., color:red, size:M)"
        value={metadata}
        onChangeText={setMetadata}
      />
      <TextInput
        style={styles.input}
        placeholder="Tags (comma-separated)"
        value={tags}
        onChangeText={setTags}
      />

      <View style={styles.buttonRow}>
        <Button title="Add Item" onPress={addItem} />
        <Button title="Clear Entries" color="red" onPress={clearAll} />
      </View>

      <FlatList
        data={items}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <View style={styles.item}>
            <Text style={styles.title}>{item.name}</Text>
            <Text>{item.category}</Text>
            <Text>{item.description}</Text>
            {Object.keys(item.metadata).length > 0 && (
              <>
                <Text>Metadata:</Text>
                {Object.entries(item.metadata).map(([k, v]) => (
                  <Text key={k}>• {k}: {String(v)}</Text>
                ))}
              </>
            )}
            <Text>Tags: {item.tags.length > 0 ? item.tags.join(', ') : '-'}</Text>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 50, padding: 20 },
  header: { fontSize: 22, fontWeight: 'bold', marginBottom: 20, textAlign: 'center' },
  input: { borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 10, marginBottom: 10 },
  buttonRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  item: { borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 10, marginBottom: 10 },
  title: { fontWeight: 'bold', fontSize: 16 },
});
