import { readFileSync } from 'fs';

export function getTestFixture(path: string) {
    return readFileSync('tests/fixtures/' + path, 'utf8');
}

export function getTestFixtureJson(path: string) {
    return JSON.parse(getTestFixture(path));
}
