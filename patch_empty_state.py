import re

with open('src/app/pages/Write.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

empty_state = """        {drafts.length === 0 && !loading && activeTab !== "analytics" && (
          <div className="text-center py-20 text-muted-foreground border border-dashed border-border rounded-2xl bg-card/50">
            <Feather size={48} className="mx-auto mb-4 opacity-30 text-purple-400" />
            <h3 className="font-semibold text-foreground text-lg mb-1">{activeTab === "drafts" ? "Belum Ada Draf Novel" : "Belum Ada Karya Terbit"}</h3>
            <p className="mb-6" style={{ fontSize: "0.9rem" }}>{activeTab === "drafts" ? "Tulis ide brilianmu sekarang dan bagikan ke pembaca." : "Terbitkan bab pertamamu agar novel muncul di sini."}</p>
            {activeTab === "drafts" && (
              <button onClick={() => setShowNewModal(true)} className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-2.5 text-primary-foreground hover:bg-primary/90 transition shadow-lg shadow-purple-500/20">
                <Plus size={18} /> Buat Novel Baru
              </button>
            )}
          </div>
        )}"""

content = re.sub(r'        \{drafts\.length === 0 && !loading && activeTab !== "analytics" && \([\s\S]*?</div>\n        \)\}', empty_state, content)

with open('src/app/pages/Write.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
print("Empty state patched")
