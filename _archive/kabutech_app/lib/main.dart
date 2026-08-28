import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_inappwebview/flutter_inappwebview.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();

  // Full-screen immersive mode — hides status & nav bars on launch
  SystemChrome.setEnabledSystemUIMode(SystemUiMode.edgeToEdge);

  // Portrait only
  await SystemChrome.setPreferredOrientations([
    DeviceOrientation.portraitUp,
    DeviceOrientation.portraitDown,
  ]);

  // Transparent status bar, dark icons
  SystemChrome.setSystemUIOverlayStyle(const SystemUiOverlayStyle(
    statusBarColor: Colors.transparent,
    statusBarIconBrightness: Brightness.dark,
    systemNavigationBarColor: Colors.transparent,
  ));

  runApp(const KabuTechApp());
}

class KabuTechApp extends StatelessWidget {
  const KabuTechApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'KabuTech Hiyas',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        useMaterial3: true,
        primaryColor: const Color(0xFF004521),
        colorScheme: ColorScheme.fromSeed(
          seedColor: const Color(0xFF004521),
        ),
      ),
      home: const WebAppScreen(),
    );
  }
}

class WebAppScreen extends StatefulWidget {
  const WebAppScreen({super.key});

  @override
  State<WebAppScreen> createState() => _WebAppScreenState();
}

class _WebAppScreenState extends State<WebAppScreen> {
  InAppWebViewController? _webCtrl;

  final InAppWebViewSettings _settings = InAppWebViewSettings(
    javaScriptEnabled: true,
    allowFileAccessFromFileURLs: true,
    allowUniversalAccessFromFileURLs: true,
    useHybridComposition: true,
    domStorageEnabled: true,
    databaseEnabled: true,
    useWideViewPort: true,
    loadWithOverviewMode: true,
    supportZoom: false,
    // Suppress JS alert/confirm/prompt popups
    disableDefaultErrorPage: true,
    // Smooth rendering
    transparentBackground: false,
  );

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF004521),
      body: SafeArea(
        child: InAppWebView(
          initialFile: 'assets/web/index.html',
          initialSettings: _settings,
          onWebViewCreated: (controller) {
            _webCtrl = controller;
          },
          // Suppress JS alert() popups — return true to silently dismiss
          onJsAlert: (controller, jsAlertRequest) async {
            return JsAlertResponse(handledByClient: true);
          },
          onJsConfirm: (controller, jsConfirmRequest) async {
            return JsConfirmResponse(
              handledByClient: true,
              action: JsConfirmResponseAction.CONFIRM,
            );
          },
          onJsPrompt: (controller, jsPromptRequest) async {
            return JsPromptResponse(handledByClient: true);
          },
          onConsoleMessage: (controller, msg) {
            debugPrint('WebConsole: ${msg.message}');
          },
        ),
      ),
    );
  }
}
