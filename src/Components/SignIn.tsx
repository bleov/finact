import { Form, InputGroup, Stack, Panel, useToaster, Notification } from "rsuite";
import { getStorage } from "../storage";
import { getLibrary } from "../Util/Network";
import { useContext, useState } from "react";
import Icon from "./Icon";
import { GlobalState } from "../App";
import { errorNotification } from "../Util/Toaster";
import { authenticateUserByName, getPublicSystemInfo } from "../Client";

const storage = getStorage();

export function SignIn(props) {
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(false);

  const { toaster } = useContext(GlobalState);

  function ServerURL() {
    const styles = {
      width: 300,
      marginBottom: 10
    };

    return (
      <>
        <Form
          onSubmit={async (e) => {
            if (!e) return;

            const urlRegex = /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_+.~#?&//=]*)/;

            let serverURL = e.serverURL;

            if (serverURL && urlRegex.test(serverURL)) {
              serverURL = serverURL.trim();
              if (serverURL.endsWith("/")) {
                serverURL = serverURL.slice(0, -1);
              }
              console.log("Using server URL: " + serverURL);
              storage.set("serverURL", serverURL);
              setLoading(true);
              try {
                const infoRequest = await getPublicSystemInfo();
                const info = infoRequest.data;

                setLoading(false);
                if (info && info.ProductName == "Jellyfin Server") {
                  if (info.StartupWizardCompleted == false) {
                    toaster.push(errorNotification("Server error", "This server is not fully set up yet."));
                    return;
                  }
                  setConnected(true);
                } else {
                  toaster.push(errorNotification("Connection error", "Is this a Jellyfin server, check the URL."));
                }
              } catch (e) {
                setLoading(false);
                console.error(e);
                toaster.push(
                  errorNotification("Connection error", "Could not communicate with the server, check the URL and your connection.")
                );
                return;
              }
            } else {
              if (serverURL) {
                toaster.push(errorNotification("Invalid URL", "Make sure you entered the full URL."));
              }
            }
          }}
        >
          <Form.Group flexDirection={"column"} content="serverURL">
            <Form.Label>Server URL</Form.Label>
            <InputGroup style={styles}>
              <Form.Control name="serverURL" placeholder="https://jellyfin.example.com" defaultValue={""} />
              <InputGroup.Button loading={loading} type="submit">
                <Icon icon="arrow_forward" size="tiny" />
              </InputGroup.Button>
            </InputGroup>
          </Form.Group>
        </Form>
      </>
    );
  }

  function SignInForm() {
    return (
      <>
        <Form
          onSubmit={async (e) => {
            if (!e) return;
            setLoading(true);
            try {
              const authResultResponse = await authenticateUserByName({
                body: {
                  Username: e.username,
                  Pw: e.password
                }
              });
              const authResult = authResultResponse.data!;

              storage.set("AccessToken", authResult.AccessToken);
              storage.set("User", authResult.User);

              setLoading(false);

              try {
                await getLibrary("music");
              } catch (e) {
                toaster.push(errorNotification("Server error", "You must have at least one music library accessible to use Finact."));
                storage.set("AccessToken", null);
                return;
              }
              props.setUser(authResult.User);
            } catch (e) {
              console.error(e);
              setLoading(false);
              toaster.push(errorNotification("Login failed", "Incorrect username or password."));
              return;
            }
          }}
        >
          <Form.Group flexDirection={"column"} paddingBottom={10} content="username">
            <Form.Label>Username</Form.Label>
            <Form.Control autoFocus name="username" placeholder="Username" defaultValue={""} />
          </Form.Group>
          <Form.Group flexDirection={"column"} content="password">
            <Form.Label>Password</Form.Label>
            <InputGroup>
              <Form.Control name="password" type="password" placeholder="Password" defaultValue={""} />
              <InputGroup.Button loading={loading} type="submit">
                <Icon icon="arrow_forward" size="tiny" />
              </InputGroup.Button>
            </InputGroup>
          </Form.Group>
        </Form>
      </>
    );
  }

  return (
    <Stack alignItems="center" justifyContent="center" style={{ height: "100%" }}>
      <Panel header="Sign in" bordered>
        {!connected ? <ServerURL /> : <SignInForm />}
      </Panel>
    </Stack>
  );
}
