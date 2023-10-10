const express = require('express')
const path = require('path')
const serveIndex = require('serve-index')
const multer  = require('multer')
const upload = multer({ dest: '../upload/' })
const {existsSync, renameSync } = require('fs')
const fs = require('fs')
const parseUrl = parseurl = require('parseurl')

process.on('SIGTERM', () => {
  debug('SIGTERM signal received: closing HTTP server')
  server.close(() => {
    debug('HTTP server closed')
  })
})

const server = express()
const port = 3000
const publicPath = path.join(__dirname, '../public')
// const publicPath = '/Volumes/KINGSTON/'
const uploadPath = path.join(__dirname, '../upload')

const publicRoute = "/public"
const uploadRoute = "/upload"
const publicPathFnd = existsSync(publicPath ) === true  
const uploadPathFnd = existsSync( uploadPath )
const uploadHtmlPath = "/html/upload.html"
let cnxCount = 0

server.get('/', (req, res) => {
  // const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress
  const ip = req.ip
  console.log(`Connection #${++cnxCount}.  ${ip}`)
  res.send(`
    Connection #${cnxCount}.  ${ip}<br>
    <b>Download</b><br>
    Route: <a href="${publicRoute}" >${publicRoute}</a><br>
    Folder: '${publicPath} &nbsp;  ${!publicPathFnd ?"- Not Found" : ""} <br>
    <b>Upload</b><br>
    Route: <a href="${uploadRoute}" >${uploadRoute}</a><br>
    Folder: '${uploadPath} &nbsp;  ${!uploadPathFnd ?"- Not Found" : ""}</br>
    Video<br>
    <video controls width="300" type="video/mp4" src="/video" />
  `)
})

function log(req, str){
  const ip = req.ip
  console.log(`#${cnxCount}. `, ip, str)
}

// stream video
server.get("/video", (req, res) => {
  console.log('video')
  // indicates the part of a document that the server should return
  // on this measure in bytes for example: range = 0-6 bytes.
  const  range = req.headers.range;
  if (!range) res.status(400).send("Range must be provided");
  
 // const  videoPath = path.join(__dirname, "public", "video.mp4");
  const  videoPath = path.join(publicPath, "_Video/New.Frontier.1939.1080p.BluRay.x265-RARBG.mp4");
  console.log(videoPath)
  if(!existsSync( videoPath )) res.status(400).send("Video not found")
  console.log(videoPath)

  // extract video size by using statSyn()
  const  videoSize = fs.statSync(videoPath).size;
  // 10 powered by 6 equal 1000000bytes = 1mb
  const  chunkSize = 10 ** 6; 
  
  // calculating video where to start and where to end.
  const  start = Number(range.replace(/\D/g, ""));
  const  end = Math.min(start + chunkSize, videoSize - 1);
  const  contentLength = end - start + 1;
  
  // setup video headers
  const  headers = {
    "Content-Range":  `bytes ${start}-${end}/${videoSize}`,
    "Accept-Ranges":  "bytes",
    "Content-Length":  contentLength,
    "Content-Type":  "video/mp4",
  };
  
  res.writeHead(206, headers);
  // creating readStream (stdin).
  const  videoStream = fs.createReadStream(videoPath, { start, end });
  
  // create live stream pipe line
  videoStream.pipe(res);
  console.log('video endpoint done')
})

// download
server.use( publicRoute, function (req, res, next) {
  ++cnxCount
  const pathName = decodeURIComponent(parseUrl(req).pathname)
  log(req, "Public: "+ pathName)
  next()
}, express.static(  publicPath ) )
server.use( publicRoute, serveIndex( publicPath, {'icons': true}))

// upload
server.get(uploadRoute, (req, res) => {
  res.sendFile(__dirname + uploadHtmlPath);
});
server.post('/uploadApi', upload.array('file1'), function (req, res, next) {
  // upload errors sent to next(err)
  // req.file is the `file1` element
  // req.body will hold the text fields, if there were any
  ++cnxCount

  const result = {}
  result['ver'] = '1.0'
  result['files'] = req.files
  result['uploadStatus'] = 'success'
  result['cnxCount'] = cnxCount

  try{
    // rename files
    let idx = 0
    req.files.forEach( obj => {
      result['renameStatus'] = obj.originalname
      log(req, `Upload #${++idx} ${obj.filename}, ${obj.originalname}`)
      renameSync(obj.path, obj.destination +obj.originalname ) // (oldPath, newPath)
    });
    result['renameStatus'] = 'success'
    return res.status(200).json( result );
  } catch (error) {
    return res.status(400).json({ message: error.message, "renameStatus": result['renameStatus'] });
  }
})
// const cpUpload = upload.fields([{ name: 'file1', maxCount: 1 }, { name: 'gallery', maxCount: 8 }])


server.listen(port, () => {
  console.log(`Server listening on port ${port}`)
})
