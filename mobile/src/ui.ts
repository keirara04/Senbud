// Shared screen styles, built on the brand tokens from @senbud/core.
import { colors, radius, space } from '@senbud/core/tokens';
import { StyleSheet } from 'react-native';

export const c = colors;

export const ui = StyleSheet.create({
  page: { padding: space.md, gap: space.md, backgroundColor: colors.light.paper, flexGrow: 1 },
  card: { backgroundColor: colors.receipt, borderRadius: radius.md, padding: space.md, gap: space.sm },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: space.sm },
  text: { color: colors.light.ink, fontSize: 16 },
  dim: { color: colors.light.inkDim, fontSize: 14 },
  label: { color: colors.light.inkDim, fontSize: 13, fontWeight: '600', textTransform: 'uppercase' },
  input: {
    backgroundColor: colors.receipt,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: '#d9dbe5',
    padding: space.sm + 4,
    fontSize: 17,
    color: colors.light.ink,
  },
  button: { backgroundColor: colors.panel, borderRadius: radius.sm, padding: space.sm + 6, alignItems: 'center' },
  buttonText: { color: colors.onPanel, fontSize: 17, fontWeight: '600' },
  link: { color: colors.light.accentInk, fontSize: 16, fontWeight: '600' },
});
