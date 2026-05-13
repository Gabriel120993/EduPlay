const path = require("path");
const { NON_STANDARD_SYMBOL } = require("@expo/config/build/environment");

/**
 * Patrón de Expo: `request.config` es el objeto `expo` ya fusionado con `app.json`.
 * Marcamos el resultado con el mismo símbolo que usa `@expo/config` para que
 * `expo-doctor` no marque un falso positivo de `app.json` “sin usar”.
 */
module.exports = (request) => {
  const config = request?.config ?? {};
  require("dotenv").config({ path: path.join(__dirname, ".env") });

  return {
    [NON_STANDARD_SYMBOL]: true,
    expo: {
      ...config,
      plugins: [
        ...(config.plugins ?? []),
        "expo-secure-store",
        "expo-image",
        [
          "expo-notifications",
          {
            color: "#6366f1",
            defaultChannel: "default",
            sounds: ["./assets/sounds/eduplay-push-chime.wav"],
          },
        ],
      ],
      extra: {
        ...(config.extra ?? {}),
        viewerUserId: process.env.EXPO_PUBLIC_USER_ID?.trim() ?? "",
        parentUserId: process.env.EXPO_PUBLIC_PARENT_ID?.trim() ?? "",
        apiUrl: process.env.EXPO_PUBLIC_API_URL?.trim() ?? "",
        eas: {
          projectId: process.env.EXPO_PUBLIC_EAS_PROJECT_ID?.trim() ?? "",
        },
      },
    },
  };
};
