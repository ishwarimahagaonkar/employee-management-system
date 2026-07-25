// EAS build hook: expo prebuild on the build server can leave both .webp (template)
// and .png (generated) launcher icons in res/mipmap-*, which fails gradle with
// "Duplicate resources". Delete the .webp when a .png twin exists.
const fs = require("fs");
const path = require("path");

const resDir = path.join(__dirname, "..", "android", "app", "src", "main", "res");

if (!fs.existsSync(resDir)) {
    console.log("clean-duplicate-icons: no android/res dir, nothing to do");
    process.exit(0);
}

let removed = 0;
for (const dir of fs.readdirSync(resDir)) {
    if (!dir.startsWith("mipmap-")) continue;
    const full = path.join(resDir, dir);
    for (const file of fs.readdirSync(full)) {
        if (!file.endsWith(".webp")) continue;
        const pngTwin = path.join(full, file.replace(/\.webp$/, ".png"));
        if (fs.existsSync(pngTwin)) {
            fs.unlinkSync(path.join(full, file));
            console.log(`clean-duplicate-icons: removed ${dir}/${file}`);
            removed++;
        }
    }
}
console.log(`clean-duplicate-icons: done, removed ${removed} duplicate(s)`);
