import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import React, { useState, useEffect, useRef } from 'react';
import { Text, View, Button, Platform } from 'react-native';


Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

async function registerNotificationCategory() {
  if (Platform.OS !== 'web') {
    try {
      const category = await Notifications.setNotificationCategoryAsync('testing', [
        {
          buttonTitle: `Accept`,
          identifier: 'first-button',
          options: {
            opensAppToForeground: false,
          },
        },
        {
          buttonTitle: 'Decline',
          identifier: 'third-button',
          options: {
            opensAppToForeground: false,
          },
        },
        {
          buttonTitle: 'Go to App',
          identifier: 'third-button',
          options: {
            opensAppToForeground: true,
          },
        },
        // {
        //   buttonTitle: 'Respond with text',
        //   identifier: 'second-button-with-text',
        //   textInput: {
        //     submitButtonTitle: 'Submit button',
        //     placeholder: 'Placeholder text',
        //   },
        // },
      ]);
      
      console.log('Notification category set', category);
    } catch(error) {
      console.warn('Could not have set notification category', error)
    }
  }
}


export default function App() {
  const [expoPushToken, setExpoPushToken] = useState('');
  const [notification, setNotification] = useState(false);
  const notificationListener = useRef();
  const responseListener = useRef();

  //upon app loading for first time
  useEffect(() => { 
    const startup = async () => {
      await registerNotificationCategory();

      const token = await registerForPushNotificationsAsync()
      setExpoPushToken(token);
    };
    startup();

    //register for the notifications, then after that is fullfilled, update expo push token state
    registerForPushNotificationsAsync().then(token => setExpoPushToken(token));

    // This listener is fired whenever a notification is received while the app is foregrounded
    notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
      setNotification(notification);
    });

    // This listener is fired whenever a user taps on or interacts with a notification (works when app is foregrounded, backgrounded, or killed)
    responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
      console.log(JSON.stringify(response));
    });

    return () => {
      Notifications.removeNotificationSubscription(notificationListener.current);
      Notifications.removeNotificationSubscription(responseListener.current);
    };
  }, []);

  return (
    <View
      style={{
        flex: 1,
        alignItems: 'center',
        justifyContent: 'space-around',
      }}>
      <Text>Your expo push token: {expoPushToken}</Text> 
      <View style={{ alignItems: 'center', justifyContent: 'center' }}>
        <Text>Title: {notification && notification.request.content.title} </Text>
        <Text>Body: {notification && notification.request.content.body}</Text>
        <Text>Data: {notification && JSON.stringify(notification.request.content.data)}</Text>
      </View>
      <Button
        title="Press to Send Notification"
        onPress={async () => {
          await sendPushNotification(expoPushToken);
        }}
      />
    </View>
  );
}

// Can use this function below, OR use Expo's Push Notification Tool-> https://expo.dev/notifications
async function sendPushNotification(expoPushToken) {
  const result = await fetch("https://exp.host/--/api/v2/push/send", {
    body: JSON.stringify({
      to: expoPushToken,
      title: 'BlockLock: Payment Confirmation Required.',
    body: 'A new payment request for $112.34 has been received for credit card ending in 1223',
      data: { random: Math.random() },
      categoryId: `testing`,
    }),
    headers: {
      "Content-Type": "application/json",
    },
    method: "POST",
  });
  console.log(JSON.stringify(result));
  return result;
}

async function registerForPushNotificationsAsync() {
  let token;
  //check if the app is running on a physical device, since push notifications won't work on a simulator.
  if (Device.isDevice) {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== 'granted') {
      alert('Failed to get push token for push notification!');
      return;
    }
    //getting our token
    token = (await Notifications.getExpoPushTokenAsync()).data;
    console.log(token);
  } else {
    alert('Must use physical device for Push Notifications');
  }
  //On Android, we need to specify a channel because default settings sometimes override the expo notification. 
  if (Platform.OS === 'android') {
    Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
    });
  }

  return token;
}

