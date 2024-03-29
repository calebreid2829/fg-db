const http = require('http');
const express = require('express');
const app = express();
const path = require('path');
//var mustacheExpress = require('mustache-express');
// Register '.mustache' extension with The Mustache Express
//app.engine('mustache', mustacheExpress());
//app.set('view engine', 'mustache');
//app.set('views', __dirname + '/views');
var mysql = require('mysql');
var con = mysql.createConnection({
  host: "localhost",
  user: "viewer",
  password: "viewer_password"
});

//const URLSearchParams = require('URLSearchParams');
//app.set('views', './views')
//app.set('view engine', 'pug')
app.use(express.json());
app.use(express.urlencoded({extended:true}));
app.use(express.static("express"));// default URL for website

app.get('/',(req,res) =>{
    res.sendFile(path.join(__dirname+'/express/index.html'));
    //con.query('SELECT fighter_id,name FROM bucklers.fighters WHERE game_id=1',function(err,result,fields){
    //    if(err) throw err;
    //    const select = document.createElement
    //})
    //let i = document.createElement('h1');
    //let x = document.createTextNode('Hello there');
    //i.appendChild(x);
    //res.render('test',{character_select:i});
});

app.post('/fighter_stats',(req,res)=>{
    con.query(`SELECT a.fighter_id,name,health,fwd_dash_speed,back_dash_speed,fwd_dash_distance,
    back_dash_distance FROM bucklers.fighters a
    LEFT JOIN bucklers.fighter_stats_sf6 b
    ON a.fighter_id = b.fighter_id`,
    function(err,result,fields){
        if(err) throw err;
        console.log('Got fighter details');
        res.send(result.splice(0));
    })
})

app.post('/query',(req,res)=>{

    const fighter_id = req.body.fighter_id
    con.query(`SELECT move_id,fighter_id,move_name,input,startup,active,recovery,on_hit,on_block
    FROM bucklers.moves_base 
    WHERE fighter_id = ${fighter_id}
    AND damage != '-'
    ORDER BY fighter_id,move_id ASC`
    , function(err, result, fields){
        if (err) throw err;
        console.log('Success!');
        //console.log(result);
        res.send(result.splice(0));
});

});
const server = http.createServer(app);
const port = 3000;
server.listen(port, () =>{
    console.log('Server listening on port ' + port);   
});
