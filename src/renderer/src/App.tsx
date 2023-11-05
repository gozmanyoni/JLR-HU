import { useEffect, useState, useMemo, createContext } from "react";
import { HashRouter as Router, Route, Routes } from "react-router-dom";
import Settings from "./components/Settings";
import Info from "./components/Info";
import Home from "./components/Home";
import Nav from "./components/Nav";
import Carplay from './components/Carplay'
import Camera from './components/Camera'
import { Box, createTheme, Modal, ThemeProvider } from "@mui/material";
import { useCarplayStore } from "./store/store";
import AudioDiskplayer from './components/mediaComponents/AudioDiskPlayer/AudioDiskplayer'

const ColorModeContext = createContext({ toggleColorMode: () => {} });

// rm -rf node_modules/.vite; npm run dev


const style = {
  position: 'absolute',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  height: '95%',
  width: '95%',
  boxShadow: 24,
  display: "flex"
};

function App() {
  const [receivingVideo, setReceivingVideo] = useState(false)
  const [commandCounter, setCommandCounter] = useState(0)
  const [keyCommand, setKeyCommand] = useState('')
  const [reverse, setReverse] = useState(false)
  const settings = useCarplayStore((state) => state.settings)
  const [mode, setMode] = useState('dark');

  const colorMode = useMemo(
    () => ({
      toggleColorMode: () => {
        setMode((prevMode) => (prevMode === 'light' ? 'dark' : 'light'));
      },
    }),
    [],
  );

  const theme = useMemo(
    () =>
      createTheme({
        palette: {
          mode,
          primary: {
            main: '#37474f'
          }
        },
        components: {
          // MuiCssBaseline: {
          //     styleOverrides: (themeParam) => `
          //         body {
          //             overflow: hidden;
          //         }
          //     `
          // }
        }
      }),
    [],
  );



  useEffect(() => {
    document.addEventListener('keydown', onKeyDown)

    return () => document.removeEventListener('keydown', onKeyDown)
  }, [settings]);


  const onKeyDown = (event: KeyboardEvent) => {
    console.log(event.code)
    if(Object.values(settings!.bindings).includes(event.code)) {
      let action = Object.keys(settings!.bindings).find(key =>
        settings!.bindings[key] === event.code
      )
      if(action !== undefined) {
        setKeyCommand(action)
        setCommandCounter(prev => prev +1)
        if(action === 'selectDown') {
          console.log('select down')
          setTimeout(() => {
            setKeyCommand('selectUp')
            setCommandCounter(prev => prev +1)
          }, 200)
        }
      }
    }
  }

  return (
    <ColorModeContext.Provider value={colorMode}>
    <ThemeProvider theme={theme}>
      <Router>
        <div
          style={{ height: '100%', touchAction: 'none' }}
          id={'main'}
          className="App"

        >
          {/*<Nav receivingVideo={receivingVideo} settings={settings}/>*/}
          {settings ? <Carplay  receivingVideo={receivingVideo} setReceivingVideo={setReceivingVideo} settings={settings} command={keyCommand} commandCounter={commandCounter}/> : null}
          <Routes>
            <Route path={"/"} element={<Home />} />
            <Route path={"/settings"} element={<Settings settings={settings!}/>} />
            <Route path={"/info"} element={<Info />} />
            <Route path={"/camera"} element={<Camera settings={settings!}/>} />
            <Route path={"/audioDiskPlayer"} element={<AudioDiskplayer />} />
          </Routes>
          <Modal
            open={reverse}
            onClick={()=> setReverse(false)}
          >
            <Box sx={style}>
              <Camera settings={settings}/>
            </Box>
          </Modal>
        </div>
      </Router>
    </ThemeProvider>
    </ColorModeContext.Provider>
  )
}

export default App
