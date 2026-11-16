# Android release signing

Release builds fail closed if `keystore.properties` is missing (no debug fallback).

## Local / CI setup

1. Create `Dripless Customer/android/keystore.properties` (gitignored):

```properties
storeFile=release.keystore
storePassword=***
keyAlias=dripless
keyPassword=***
```

2. Place the keystore file next to that properties file (or use an absolute `storeFile` path).

3. In CI, inject these values from secrets (`STORE_FILE`, `STORE_PASSWORD`, `KEY_ALIAS`, `KEY_PASSWORD`) and write `keystore.properties` before `./gradlew assembleRelease`.
