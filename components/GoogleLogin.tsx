// GoogleLogin.js
import { useEffect, useState } from "react";
import * as WebBrowser from "expo-web-browser";
import * as Google from "expo-auth-session/providers/google";
import { Platform } from "react-native";

WebBrowser.maybeCompleteAuthSession();

export const useGoogleLogin = () => {
  const [request, response, promptAsync] = Google.useAuthRequest({
    androidClientId: "YOUR_ANDROID_CLIENT_ID.apps.googleusercontent.com",
    iosClientId: "YOUR_IOS_CLIENT_ID.apps.googleusercontent.com",
    webClientId: "YOUR_WEB_CLIENT_ID.apps.googleusercontent.com",
    scopes: ["profile", "email"],
  });

  const [error, setError] = useState(null);

  useEffect(() => {
    if (response?.type === "error") {
      setError(response.error);
    }
  }, [response]);

  const resetGoogleState = () => {
    setError(null);
  };

  return {
    promptAsync,
    response,
    error,
    resetGoogleState,
  };
};
