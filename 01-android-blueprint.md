# 01 — Android Studio Project Blueprint

## Stack

- **Language**: Kotlin
- **UI**: Jetpack Compose + Material 3
- **Min SDK**: 24 · **Target SDK**: 34
- **DI**: Hilt
- **Networking**: Firebase SDK + Retrofit (optional)
- **Auth**: Firebase Auth (email/password + Google)
- **DB**: Cloud Firestore
- **Functions**: Firebase Cloud Functions
- **Ads**: Google AdMob (Rewarded + Banner + Interstitial)

## Folder structure

```
app/
 ├─ build.gradle.kts
 └─ src/main/
     ├─ AndroidManifest.xml
     ├─ java/com/pointpal/app/
     │   ├─ PointPalApp.kt              // @HiltAndroidApp + MobileAds.initialize()
     │   ├─ MainActivity.kt             // single Activity, Compose nav host
     │   ├─ ui/
     │   │   ├─ theme/                  // Color.kt, Type.kt, Theme.kt
     │   │   ├─ splash/SplashScreen.kt
     │   │   ├─ auth/LoginScreen.kt
     │   │   ├─ auth/RegisterScreen.kt
     │   │   ├─ home/HomeScreen.kt
     │   │   ├─ earn/EarnScreen.kt
     │   │   ├─ wallet/WalletScreen.kt
     │   │   ├─ referral/ReferralScreen.kt
     │   │   ├─ settings/SettingsScreen.kt
     │   │   └─ components/BottomNav.kt, BalanceCard.kt
     │   ├─ data/
     │   │   ├─ AuthRepository.kt
     │   │   ├─ UserRepository.kt
     │   │   ├─ RewardRepository.kt     // calls Cloud Functions
     │   │   └─ models/User.kt, Earning.kt, Withdrawal.kt
     │   ├─ ads/
     │   │   ├─ AdMobManager.kt         // rewarded ad load/show
     │   │   └─ BannerAdView.kt         // Compose wrapper
     │   └─ di/
     │       └─ AppModule.kt            // Hilt providers
     └─ res/
         └─ values/strings.xml          // admob_app_id, admob_rewarded_id
```

## `app/build.gradle.kts` — key dependencies

```kotlin
plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
    id("com.google.gms.google-services")
    id("com.google.dagger.hilt.android")
    id("kotlin-kapt")
}

dependencies {
    // Compose
    implementation(platform("androidx.compose:compose-bom:2024.10.00"))
    implementation("androidx.compose.material3:material3")
    implementation("androidx.activity:activity-compose:1.9.3")
    implementation("androidx.navigation:navigation-compose:2.8.4")

    // Firebase
    implementation(platform("com.google.firebase:firebase-bom:33.6.0"))
    implementation("com.google.firebase:firebase-auth-ktx")
    implementation("com.google.firebase:firebase-firestore-ktx")
    implementation("com.google.firebase:firebase-functions-ktx")
    implementation("com.google.android.gms:play-services-auth:21.2.0")

    // AdMob
    implementation("com.google.android.gms:play-services-ads:23.4.0")

    // Hilt
    implementation("com.google.dagger:hilt-android:2.52")
    kapt("com.google.dagger:hilt-android-compiler:2.52")
    implementation("androidx.hilt:hilt-navigation-compose:1.2.0")

    // Coroutines / Lifecycle
    implementation("androidx.lifecycle:lifecycle-viewmodel-compose:2.8.7")
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-play-services:1.9.0")
}
```

## `AndroidManifest.xml` — required entries

```xml
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />

<application
    android:name=".PointPalApp"
    android:allowBackup="true"
    android:icon="@mipmap/ic_launcher"
    android:label="PointPal"
    android:theme="@style/Theme.PointPal">

    <!-- REPLACE with your real AdMob App ID -->
    <meta-data
        android:name="com.google.android.gms.ads.APPLICATION_ID"
        android:value="ca-app-pub-3940256099942544~3347511713"/>

    <activity android:name=".MainActivity" android:exported="true">
        <intent-filter>
            <action android:name="android.intent.action.MAIN" />
            <category android:name="android.intent.category.LAUNCHER" />
        </intent-filter>
    </activity>
</application>
```

## Screen flow

```
Splash → (logged in?) → Home          ┌─ Earn
                ↓ no                  │
            Login / Register   Home →─┼─ Wallet
                                       │
                                       ├─ Referral
                                       │
                                       └─ Settings
```

## Kotlin skeletons

### `AdMobManager.kt`

```kotlin
@Singleton
class AdMobManager @Inject constructor(@ApplicationContext private val ctx: Context) {

    private var rewardedAd: RewardedAd? = null
    private val unitId = "ca-app-pub-3940256099942544/5224354917" // test ID

    fun load() {
        RewardedAd.load(ctx, unitId, AdRequest.Builder().build(),
            object : RewardedAdLoadCallback() {
                override fun onAdLoaded(ad: RewardedAd) { rewardedAd = ad }
                override fun onAdFailedToLoad(e: LoadAdError) { rewardedAd = null }
            })
    }

    fun show(activity: Activity, onReward: () -> Unit) {
        rewardedAd?.show(activity) { onReward() } ?: load()
        rewardedAd?.fullScreenContentCallback = object : FullScreenContentCallback() {
            override fun onAdDismissedFullScreenContent() { rewardedAd = null; load() }
        }
    }
}
```

### `RewardRepository.kt`

```kotlin
class RewardRepository @Inject constructor(
    private val functions: FirebaseFunctions,
) {
    suspend fun creditAdReward(): Result<Double> = runCatching {
        val res = functions.getHttpsCallable("rewardAd").call().await()
        (res.data as Map<*,*>)["newBalance"] as Double
    }

    suspend fun requestWithdrawal(amount: Double, method: String, account: String) = runCatching {
        functions.getHttpsCallable("requestWithdrawal").call(
            mapOf("amount" to amount, "method" to method, "account" to account)
        ).await()
    }
}
```

### `EarnScreen.kt` (excerpt)

```kotlin
@Composable
fun EarnScreen(vm: EarnViewModel = hiltViewModel(), activity: Activity) {
    val state by vm.state.collectAsState()

    Button(onClick = { vm.watchAd(activity) }) {
        Text("Watch ad — earn $0.05")
    }
}

@HiltViewModel
class EarnViewModel @Inject constructor(
    private val ads: AdMobManager,
    private val rewards: RewardRepository,
) : ViewModel() {
    fun watchAd(activity: Activity) = viewModelScope.launch {
        ads.show(activity) {
            viewModelScope.launch { rewards.creditAdReward() }
        }
    }
}
```

> The reward is **only** credited server-side from the Cloud Function — the client
> just signals that the ad was watched. The Cloud Function additionally verifies
> the user is authenticated and applies a cooldown.
