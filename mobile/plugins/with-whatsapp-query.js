// Lets Linking.canOpenURL('whatsapp://…') see WhatsApp on Android 11+ (package visibility).
// SDK 58's app config has no android "queries" key, hence this plugin. iOS uses
// ios.infoPlist.LSApplicationQueriesSchemes in app.json.
const { withAndroidManifest } = require('expo/config-plugins');

module.exports = (config) =>
  withAndroidManifest(config, (c) => {
    const manifest = c.modResults.manifest;
    manifest.queries = manifest.queries ?? [{}];
    const q = manifest.queries[0];
    q.intent = q.intent ?? [];
    const has = q.intent.some((i) => i.data?.some((d) => d.$?.['android:scheme'] === 'whatsapp'));
    if (!has) q.intent.push({ action: [{ $: { 'android:name': 'android.intent.action.VIEW' } }], data: [{ $: { 'android:scheme': 'whatsapp' } }] });
    return c;
  });
