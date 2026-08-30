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
    
    // We added <TouchableOpacity hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
    // If there is another hitSlop down the line in the same tag, it's a duplicate.
    
    // A regex to find our exact inserted string:
    const injectedStr = ' hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}';
    
    // We can parse all <TouchableOpacity ...> and <Pressable ...>
    const regex = /<(TouchableOpacity|Pressable)([\s\S]*?)>/g;
    
    let updatedContent = content.replace(regex, (match, tag, attrs) => {
      // Find how many times 'hitSlop' appears in attrs
      const hitSlopMatches = attrs.match(/hitSlop/g);
      
      if (hitSlopMatches && hitSlopMatches.length > 1) {
        // It's duplicated. Remove the one we injected
        // Wait, the one we injected is at the very beginning of attrs
        // Let's just remove the exact string we injected.
        let newAttrs = attrs.replace(injectedStr, '');
        return `<${tag}${newAttrs}>`;
      }
      
      return match;
    });
    
    if (content !== updatedContent) {
      fs.writeFileSync(filePath, updatedContent);
      modifiedCount++;
      console.log('Fixed duplicate hitSlop in: ' + filePath);
    }
  }
});

console.log('Total files fixed: ' + modifiedCount);
