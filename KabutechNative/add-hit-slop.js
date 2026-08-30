const fs = require('fs');
const path = require('path');

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? walkDir(dirPath, callback) : callback(path.join(dir, f));
  });
}

let modifiedCount = 0;

walkDir('src', function(filePath) {
  if (filePath.endsWith('.tsx') || filePath.endsWith('.js') || filePath.endsWith('.ts')) {
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Use regex to match <TouchableOpacity and <Pressable
    // Capture the name and the attributes
    const regex = /<(TouchableOpacity|Pressable)([\s\S]*?)>/g;
    
    let updatedContent = content.replace(regex, (match, tag, attrs) => {
      // Avoid if already has hitSlop
      if (attrs.includes('hitSlop')) {
        return match;
      }
      
      // We only want to insert hitSlop
      return `<${tag} hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}${attrs}>`;
    });
    
    if (content !== updatedContent) {
      fs.writeFileSync(filePath, updatedContent);
      modifiedCount++;
      console.log('Updated: ' + filePath);
    }
  }
});

console.log('Total files updated: ' + modifiedCount);
