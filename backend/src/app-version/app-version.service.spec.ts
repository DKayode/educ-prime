import { AppVersionService } from './app-version.service';

// compareVersions / determineUpdateType are pure — the resolver is never touched.
const service = new AppVersionService({} as any);

describe('AppVersionService.compareVersions', () => {
    it('orders the numeric components, not the strings', () => {
        expect(service.compareVersions('1.0.10', '1.0.9')).toBe(1);
        expect(service.compareVersions('1.0.9', '1.0.10')).toBe(-1);
        expect(service.compareVersions('1.0.9', '1.0.9')).toBe(0);
        expect(service.compareVersions('1.1.0', '1.0.99')).toBe(1);
        expect(service.compareVersions('2.0.0', '1.99.99')).toBe(1);
    });

    // The regression: Flutter reports `version+build`, and `.map(Number)` made
    // that NaN, which `|| 0` read as patch 0 — so 1.0.13+48 compared as 1.0.0.
    it('ignores the Flutter +build suffix', () => {
        expect(service.compareVersions('1.0.13+48', '1.0.9')).toBe(1);
        expect(service.compareVersions('1.0.13+48', '1.0.13')).toBe(0);
        expect(service.compareVersions('1.0.2+7', '1.0.9')).toBe(-1);
        expect(service.compareVersions('1.0.9+1', '1.0.9+999')).toBe(0);
    });

    it('ignores a pre-release tag and a leading v', () => {
        expect(service.compareVersions('1.0.13-beta.2', '1.0.9')).toBe(1);
        expect(service.compareVersions('v1.0.13', '1.0.9')).toBe(1);
        expect(service.compareVersions('1.0.13-rc1+48', '1.0.13')).toBe(0);
    });

    it('treats missing components as zero', () => {
        expect(service.compareVersions('1.0', '1.0.0')).toBe(0);
        expect(service.compareVersions('1', '1.0.1')).toBe(-1);
    });

    it('compares equal when a version cannot be parsed, never lower', () => {
        // A client we cannot read must not be force-updated out of the app.
        for (const junk of ['', '   ', 'abc', 'nightly', null as any, undefined as any]) {
            expect(service.compareVersions(junk, '1.0.9')).toBe(0);
            expect(service.compareVersions('1.0.9', junk)).toBe(0);
        }
    });
});

describe('AppVersionService.determineUpdateType', () => {
    // The live prod row at the time of the bug: android 1.0.9 / min 1.0.9.
    const latest = '1.0.9';
    const min = '1.0.9';

    it('does not force-update a build newer than latest', () => {
        expect(service.determineUpdateType('1.0.13+48', latest, min)).toBe('up_to_date');
        expect(service.determineUpdateType('1.0.9+48', latest, min)).toBe('up_to_date');
    });

    it('still requires an update below the minimum', () => {
        expect(service.determineUpdateType('1.0.2+7', latest, min)).toBe('required');
    });

    it('offers an optional update between minimum and latest', () => {
        expect(service.determineUpdateType('1.0.5+3', '1.0.9', '1.0.2')).toBe('optional');
    });

    it('lets an unparseable client through instead of locking it out', () => {
        expect(service.determineUpdateType('nightly', latest, min)).toBe('up_to_date');
    });
});
