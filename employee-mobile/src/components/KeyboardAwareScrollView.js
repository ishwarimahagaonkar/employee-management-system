import React, { forwardRef, useEffect, useState } from "react";
import { Keyboard, Platform, ScrollView } from "react-native";

/**
 * A ScrollView that keeps room below the keyboard.
 *
 * Drop-in replacement for ScrollView in any form. Three different failures had
 * grown up around this, all with the same symptom -- fields and Save buttons
 * hidden behind the keyboard -- but different causes:
 *
 *   - Inside a Modal (Add Site, Add Meeting): KeyboardAvoidingView was given
 *     behavior={undefined} on Android, which is no avoidance at all. The app
 *     relies on the activity's adjustResize instead, but React Native's Modal
 *     opens its OWN window and does not inherit that reliably. Nothing moved.
 *   - On a plain screen (Apply Leave): the window does resize, so the list
 *     shrinks correctly -- but nothing scrolls the focused input into view, so
 *     the Submit button below a multiline field sat under the keyboard with no
 *     way to reach it.
 *
 * Padding the scroll content by the keyboard's real height fixes both: it is
 * the missing space when the window did not resize, and simply extra scroll
 * room when it did.
 *
 * Android only, deliberately. On iOS the surrounding KeyboardAvoidingView
 * already lifts the sheet, and adding padding on top of that would
 * double-compensate and leave a gap. Reading the height from the event rather
 * than assuming a fixed value is what makes this work across screen sizes and
 * with third-party keyboards, which are taller than the stock one.
 *
 * No native module is involved -- Keyboard and ScrollView are React Native
 * core, so this needs no rebuild.
 */
const KeyboardAwareScrollView = forwardRef(function KeyboardAwareScrollView(
  { children, contentContainerStyle, extraBottomSpace = 24, ...rest },
  ref
) {
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    if (Platform.OS !== "android") return undefined;

    // didShow rather than willShow: Android does not emit the "will" events.
    const show = Keyboard.addListener("keyboardDidShow", (event) => {
      setKeyboardHeight(event?.endCoordinates?.height ?? 0);
    });
    const hide = Keyboard.addListener("keyboardDidHide", () => {
      setKeyboardHeight(0);
    });

    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  return (
    <ScrollView
      ref={ref}
      // Without this the first tap on Save while the keyboard is open is
      // swallowed dismissing it, so the button appears to need two presses.
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
      {...rest}
      contentContainerStyle={[
        contentContainerStyle,
        { paddingBottom: keyboardHeight + extraBottomSpace },
      ]}
    >
      {children}
    </ScrollView>
  );
});

export default KeyboardAwareScrollView;
