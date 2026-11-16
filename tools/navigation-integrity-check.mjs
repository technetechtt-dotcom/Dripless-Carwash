import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();

const read = (relativePath) =>
  fs.readFileSync(path.join(ROOT, relativePath), 'utf8');

const walkFiles = (dirPath, files = []) => {
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name === 'node_modules' || entry.name === 'dist' || entry.name === '.git') {
      continue;
    }
    const fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      walkFiles(fullPath, files);
      continue;
    }
    if (entry.isFile() && (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts'))) {
      files.push(fullPath);
    }
  }
  return files;
};

const collectMatches = (text, regex, groupIndex = 1) => {
  const results = [];
  for (const match of text.matchAll(regex)) {
    if (match[groupIndex]) {
      results.push(match[groupIndex]);
    }
  }
  return results;
};

const unique = (items) => [...new Set(items)];

const fail = (message) => {
  console.error(`\n[check:navigation] ${message}`);
  process.exitCode = 1;
};

const APP_SOURCE_DIRS = [
  'Dripless Customer/src',
  'Dripless Driver/src',
  'Dripless Ops Admin/src'
];

/**
 * Extract JSX <button ...> opening tags (supports multiline attributes).
 * Returns { attrs, labelHint, line } for each button.
 */
const extractButtons = (source) => {
  const buttons = [];
  const regex = /<button\b([\s\S]*?)>/gi;
  for (const match of source.matchAll(regex)) {
    const attrs = match[1] ?? '';
    const start = match.index ?? 0;
    const line = source.slice(0, start).split('\n').length;
    const after = source.slice(start + match[0].length, start + match[0].length + 120);
    const labelMatch = after.match(/^\s*([^<{]+)/);
    const labelHint = (labelMatch?.[1] ?? '').trim().replace(/\s+/g, ' ').slice(0, 60);
    buttons.push({ attrs, labelHint, line });
  }
  return buttons;
};

const isInteractiveButton = (attrs) => {
  const normalized = attrs.replace(/\s+/g, ' ');
  if (/\bonClick\s*=/.test(normalized)) return true;
  if (/\bonKeyDown\s*=/.test(normalized)) return true;
  if (/\btype\s*=\s*['"]submit['"]/.test(normalized)) return true;
  if (/\btype\s*=\s*['"]reset['"]/.test(normalized)) return true;
  if (/\bform\s*=/.test(normalized)) return true;
  if (/\bformAction\s*=/.test(normalized)) return true;
  // Explicitly disabled / decorative placeholders still count as intentional if labelled aria-disabled
  if (/\baria-disabled\s*=\s*\{?\s*true/.test(normalized)) return true;
  return false;
};

const checkDeadButtons = () => {
  const dead = [];

  for (const relativeDir of APP_SOURCE_DIRS) {
    const dirPath = path.join(ROOT, relativeDir);
    if (!fs.existsSync(dirPath)) continue;
    const files = walkFiles(dirPath);
    for (const filePath of files) {
      const source = fs.readFileSync(filePath, 'utf8');
      const buttons = extractButtons(source);
      for (const button of buttons) {
        if (!isInteractiveButton(button.attrs)) {
          dead.push({
            file: path.relative(ROOT, filePath),
            line: button.line,
            label: button.labelHint || '(no text)'
          });
        }
      }
    }
  }

  if (dead.length > 0) {
    fail(`Found ${dead.length} button(s) without an action handler:`);
    for (const item of dead) {
      console.error(`  - ${item.file}:${item.line}  "${item.label}"`);
    }
  } else {
    console.log('[check:navigation] No dead buttons found across Customer/Driver/Ops.');
  }
};

const checkCustomerNavigation = () => {
  const appSource = read('Dripless Customer/src/App.tsx');
  const customerSourceDir = path.join(ROOT, 'Dripless Customer/src');
  const customerFiles = walkFiles(customerSourceDir);

  const appRoutes = unique(collectMatches(appSource, /path="([^"]+)"/g));
  const staticRoutes = new Set(appRoutes.filter((route) => !route.includes(':')));
  const dynamicBookingRoute = appRoutes.find((route) => route.includes(':service'));

  const targets = [];
  for (const filePath of customerFiles) {
    const source = fs.readFileSync(filePath, 'utf8');
    const fileTargets = [
      ...collectMatches(source, /navigate\(\s*['"]([^'"]+)['"]/g),
      ...collectMatches(source, /to=['"]([^'"]+)['"]/g)
    ];
    for (const target of fileTargets) {
      if (target.startsWith('http://') || target.startsWith('https://')) {
        continue;
      }
      targets.push({
        target,
        file: path.relative(ROOT, filePath)
      });
    }
  }

  const invalidTargets = [];
  for (const item of targets) {
    const isStaticValid = staticRoutes.has(item.target);
    const isDynamicBookingValid = Boolean(
      dynamicBookingRoute &&
      item.target.startsWith('/booking/') &&
      item.target.length > '/booking/'.length
    );
    if (!isStaticValid && !isDynamicBookingValid) {
      invalidTargets.push(item);
    }
  }

  if (invalidTargets.length > 0) {
    fail('Customer app has navigation targets without matching routes:');
    for (const item of invalidTargets) {
      console.error(`  - ${item.target} in ${item.file}`);
    }
  } else {
    console.log('[check:navigation] Customer app route targets are valid.');
  }
};

const checkDriverNavigation = () => {
  const appSource = read('Dripless Driver/src/App.tsx');
  const tabsSource = read('Dripless Driver/src/utils/routes.ts');

  const tabValueMatches = collectMatches(tabsSource, /\w+:\s*'([^']+)'/g);
  const tabValues = unique(tabValueMatches);
  const switchCases = unique(collectMatches(appSource, /case DRIVER_TABS\.\w+:/g, 0));

  const missingSwitchCases = tabValues.filter((tabValue) => {
    const tabKey = tabValue.toUpperCase();
    return !switchCases.some((switchCase) => switchCase.includes(`DRIVER_TABS.${tabKey}`));
  });

  if (missingSwitchCases.length > 0) {
    fail(`Driver app is missing App.tsx tab render cases for: ${missingSwitchCases.join(', ')}`);
  } else {
    console.log('[check:navigation] Driver tab rendering covers all tabs.');
  }
};

const checkOpsNavigation = () => {
  const appSource = read('Dripless Ops Admin/src/App.tsx');
  const navigationSource = read('Dripless Ops Admin/src/pages/dashboard/navigation.ts');

  const tabKeys = unique(collectMatches(navigationSource, /key:\s*'([^']+)'/g));
  const pageByTabKeys = unique(collectMatches(appSource, /(\w+):\s*<\w+RoutePage\s*\/>/g));
  const usesDashboardTabsMap = appSource.includes('dashboardTabs.map');
  const missingPageComponents = tabKeys.filter((tab) => !pageByTabKeys.includes(tab));

  // Dedicated page wrappers must exist for each menu tab.
  const routePageFiles = tabKeys.map(
    (tab) => `Dripless Ops Admin/src/pages/dashboard/${tab[0].toUpperCase()}${tab.slice(1)}RoutePage.tsx`
  );
  // Specials/customers etc capitalize first letter only - SpecialsRoutePage, CustomersRoutePage.
  // Notifications => NotificationsRoutePage. Overview => OverviewRoutePage.
  const expectedRouteFiles = {
    overview: 'Dripless Ops Admin/src/pages/dashboard/OverviewRoutePage.tsx',
    dispatch: 'Dripless Ops Admin/src/pages/dashboard/DispatchRoutePage.tsx',
    bookings: 'Dripless Ops Admin/src/pages/dashboard/BookingsRoutePage.tsx',
    specials: 'Dripless Ops Admin/src/pages/dashboard/SpecialsRoutePage.tsx',
    customers: 'Dripless Ops Admin/src/pages/dashboard/CustomersRoutePage.tsx',
    drivers: 'Dripless Ops Admin/src/pages/dashboard/DriversRoutePage.tsx',
    notifications: 'Dripless Ops Admin/src/pages/dashboard/NotificationsRoutePage.tsx'
  };

  const missingFiles = Object.entries(expectedRouteFiles)
    .filter(([, relativePath]) => !fs.existsSync(path.join(ROOT, relativePath)))
    .map(([tab]) => tab);

  if (!usesDashboardTabsMap && missingPageComponents.length > 0) {
    fail(`Ops app is missing page components for dashboard tabs: ${missingPageComponents.join(', ')}`);
  } else if (missingFiles.length > 0) {
    fail(`Ops app is missing dedicated route page files for: ${missingFiles.join(', ')}`);
  } else {
    console.log('[check:navigation] Ops dashboard tabs each have dedicated page routes.');
  }

  // silence unused
  void routePageFiles;
};

console.log('[check:navigation] Running cross-platform navigation integrity checks...');
checkCustomerNavigation();
checkDriverNavigation();
checkOpsNavigation();
checkDeadButtons();

if (process.exitCode && process.exitCode !== 0) {
  console.error('[check:navigation] FAILED');
  process.exit(process.exitCode);
}

console.log('[check:navigation] PASSED');
