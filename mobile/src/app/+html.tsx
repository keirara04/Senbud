// The web app's HTML shell. Adds what "Add to Home Screen" needs: the app icon, a manifest, and
// full-screen standalone mode, so the web app looks like the native one. headNodes and bodyNodes
// carry Expo's own tags (including the app's scripts), so they must stay.
import { ScrollViewStyleReset, useServerDocumentContext } from 'expo-router/html';
import type { PropsWithChildren } from 'react';

export default function Root({ children }: PropsWithChildren) {
  const { htmlAttributes, bodyAttributes, headNodes, bodyNodes } = useServerDocumentContext();
  return (
    <html lang="en" {...htmlAttributes}>
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no, viewport-fit=cover" />
        <title>Senbud</title>
        <meta name="description" content="Your money buddy. Know what's safe to spend today." />
        <link rel="manifest" href="/manifest.webmanifest" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-title" content="Senbud" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="theme-color" content="#0B1033" />
        <ScrollViewStyleReset />
        {/* Night behind the app while it loads: dark is the default look.
            On a home-screen iPhone app ("black-translucent") the page is drawn from the top of the screen,
            under the status bar, yet iOS first reports a viewport one status bar short (812 of 874 pt on
            an iPhone 17) and only sometimes corrects it later, so the bottom was cut off. A standalone app
            fills the screen, so there the script sizes the page to the screen itself (--app-h); browsers
            keep 100dvh. The root keeps its content clear of the status bar and home indicator; the app's
            own safe-area insets are 0 on web. */}
        <style
          dangerouslySetInnerHTML={{
            __html:
              'body{background-color:#0b1033}html,body,#root{height:var(--app-h,100dvh)}#root{box-sizing:border-box;padding:env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left)}',
          }}
        />
        <script
          dangerouslySetInnerHTML={{
            __html:
              // ponytail: assumes the standalone app is full screen (true on iPhone); iPad Split View would want 100dvh.
              "(function(){function f(){var s=matchMedia('(display-mode: standalone)').matches||navigator.standalone;var land=matchMedia('(orientation: landscape)').matches;var h=Math.min(screen.width,screen.height),w=Math.max(screen.width,screen.height);document.documentElement.style.setProperty('--app-h',s?(land?h:w)+'px':'100dvh')}f();addEventListener('resize',f);addEventListener('orientationchange',f)})()",
          }}
        />
        {headNodes}
      </head>
      <body {...bodyAttributes}>
        {children}
        {bodyNodes}
      </body>
    </html>
  );
}
