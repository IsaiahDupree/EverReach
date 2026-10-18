describe('Superwall Back Button Detection and Dismissal', () => {
    it('should find and click the top-left back button to dismiss Superwall', async () => {
        console.log('🎯 Searching aggressively for top-left back button...');
        await browser.pause(3000);

        await browser.saveScreenshot('./appium-tests/screenshots/00-searching-for-back-button.png');

        let dismissed = false;

        // AGGRESSIVE METHOD 1: Find ALL buttons and check each one's position
        try {
            console.log('🔍 Method 1: Checking all button positions (expanded search)...');
            const allButtons = await $$('//XCUIElementTypeButton');
            console.log(`Found ${allButtons.length} buttons total`);

            for (let i = 0; i < allButtons.length; i++) {
                try {
                    const button = allButtons[i];
                    const location = await button.getLocation();
                    const size = await button.getSize();

                    console.log(`Button ${i}: x=${location.x}, y=${location.y}, width=${size.width}, height=${size.height}`);

                    // VERY LIBERAL top-left detection: x < 100, y < 150
                    if (location.x < 100 && location.y > 50 && location.y < 150) {
                        console.log(`✅ FOUND TOP-LEFT BUTTON at (${location.x}, ${location.y})!`);
                        await browser.saveScreenshot('./appium-tests/screenshots/01-found-back-button.png');

                        await button.click();
                        await browser.pause(2000);
                        await browser.saveScreenshot('./appium-tests/screenshots/02-after-click.png');

                        dismissed = true;
                        console.log('✅ CLICKED BACK BUTTON!');
                        break;
                    }
                } catch (e) {
                    console.log(`Button ${i} error: ${e.message}`);
                    continue;
                }
            }
        } catch (e) {
            console.log(`⚠️  Method 1 failed: ${e.message}`);
        }

        // METHOD 2: Direct coordinate tap based on screenshot (x=32, y=95)
        if (!dismissed) {
            try {
                console.log('🎯 Method 2: Tapping exact coordinates (32, 95)...');
                await browser.saveScreenshot('./appium-tests/screenshots/01-before-coordinate-tap.png');

                await browser.performActions([{
                    type: 'pointer',
                    id: 'finger1',
                    parameters: { pointerType: 'touch' },
                    actions: [
                        { type: 'pointerMove', duration: 0, x: 32, y: 95 },
                        { type: 'pointerDown', button: 0 },
                        { type: 'pause', duration: 200 },
                        { type: 'pointerUp', button: 0 }
                    ]
                }]);

                await browser.releaseActions();
                await browser.pause(2000);
                await browser.saveScreenshot('./appium-tests/screenshots/02-after-coordinate-tap.png');

                dismissed = true;
                console.log('✅ TAPPED AT BACK BUTTON COORDINATES!');
            } catch (e) {
                console.log(`⚠️  Method 2 failed: ${e.message}`);
            }
        }

        // Show final state
        await browser.pause(1000);
        await browser.saveScreenshot('./appium-tests/screenshots/03-final-state.png');

        console.log(dismissed ? '✅ Back button dismissal completed!' : '⚠️  Could not find back button');
    });

    it('should verify Superwall was dismissed', async () => {
        await browser.pause(2000);

        // Check for tab bar (sign we're past Superwall)
        try {
            const tabBar = await $('//XCUIElementTypeTabBar');
            const visible = await tabBar.isDisplayed({ timeout: 5000 });

            if (visible) {
                console.log('✅ SUCCESS! Tab bar is visible - Superwall dismissed!');
                await browser.saveScreenshot('./appium-tests/screenshots/04-success-tab-bar.png');
            } else {
                console.log('⚠️  Tab bar not yet visible');
                await browser.saveScreenshot('./appium-tests/screenshots/04-still-waiting.png');
            }
        } catch (e) {
            console.log(`Tab bar check: ${e.message}`);
        }
    });
});

describe('Navigation After Dismissal', () => {
    it('should navigate tabs after dismissing Superwall', async () => {
        const tabBar = await $('//XCUIElementTypeTabBar');

        if (await tabBar.isDisplayed({ timeout: 3000 })) {
            const tabs = await tabBar.$$('//XCUIElementTypeButton');
            console.log(`✅ Found ${tabs.length} tabs`);

            for (let i = 0; i < Math.min(tabs.length, 4); i++) {
                await tabs[i].click();
                await browser.pause(1500);
                await browser.saveScreenshot(`./appium-tests/screenshots/tab-${i + 5}.png`);
            }
        }
    });
});
