const fs = require("fs");
const f = "desktop/pair-page.html";
let s = fs.readFileSync(f, "utf8");

const dels = [
  ['cancel: "Cancel",', 'del: "Delete",'],
  ['cancel: "Cancelar",', 'del: "Eliminar",'],
  ['cancel: "Annuler",', 'del: "Supprimer",'],
  ['cancel: "Abbrechen",', 'del: "Löschen",'],
  ['cancel: "Cancelar",', 'del: "Excluir",'],
  ['cancel: "إلغاء",', 'del: "حذف",'],
  ['cancel: "Anuluj",', 'del: "Usuń",'],
  ['cancel: "Annulla",', 'del: "Elimina",'],
  ['cancel: "Annuleren",', 'del: "Verwijderen",'],
  ['cancel: "Vazgeç",', 'del: "Sil",'],
  ['cancel: "キャンセル",', 'del: "削除",'],
  ['cancel: "取消",', 'del: "删除",'],
];

let count = 0;
for (const [from, to] of dels) {
  if (s.includes(from)) {
    s = s.split(from).join(from + " " + to);
    count++;
  } else {
    console.log("MISS:", from);
  }
}

// Use the "del" key for the delete button aria-label instead of "cancel".
s = s.split('aria-label="' + '${' + 'esc(tr("cancel"))' + '}"').join('aria-label="' + '${' + 'esc(tr("del"))' + '}"');

fs.writeFileSync(f, s);
console.log("added del keys:", count);
