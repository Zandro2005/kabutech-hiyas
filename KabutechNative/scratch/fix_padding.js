const fs = require('fs');
const path = require('path');

const screensDir = path.join(__dirname, '../src/screens');

const processDir = (dir) => {
    fs.readdirSync(dir).forEach(file => {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            processDir(fullPath);
        } else if (fullPath.endsWith('.tsx')) {
            let content = fs.readFileSync(fullPath, 'utf8');
            if (content.includes('<ScreenHeader />')) {
                // If it already has SafeAreaView wrapping the root, skip it
                if (content.includes('<SafeAreaView') && (content.includes('edges={[\'top\']}') || content.includes('style={tw`flex-1'))) {
                    // Already wrapped (like HomeScreen)
                } else {
                    // Replace <View style={tw`flex-1 ...`} with <SafeAreaView edges={['top']} style={tw`flex-1 ...`}
                    // And add import if missing
                    let modified = false;
                    content = content.replace(/return \(\s*<View (style=\{tw`flex-1[^`]*`\})/g, (match, p1) => {
                        modified = true;
                        return `return (\n    <SafeAreaView edges={['top']} ${p1}>`;
                    });

                    if (modified) {
                        content = content.replace(/<\/View>\s*\);\s*}\s*$/g, "</SafeAreaView>\n  );\n}\n");
                        
                        if (!content.includes("import { SafeAreaView }")) {
                            if (content.includes("import { SafeAreaView, useSafeAreaInsets }")) {
                                // already imported
                            } else if (content.includes("useSafeAreaInsets")) {
                                content = content.replace("useSafeAreaInsets } from 'react-native-safe-area-context';", "useSafeAreaInsets, SafeAreaView } from 'react-native-safe-area-context';");
                            } else {
                                content = "import { SafeAreaView } from 'react-native-safe-area-context';\n" + content;
                            }
                        }
                        fs.writeFileSync(fullPath, content);
                        console.log(`Updated ${fullPath}`);
                    }
                }
            }
        }
    });
};

processDir(screensDir);
