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
        {/* Night behind the app while it loads: dark is the default look. */}
        <style dangerouslySetInnerHTML={{ __html: 'body{background-color:#0b1033}' }} />
        {headNodes}
      </head>
      <body {...bodyAttributes}>
        {children}
        {bodyNodes}
      </body>
    </html>
  );
}
