class fighter {
    constructor(name){
        this.name=name,
        this.movelist=null,
        this.elements = this.find_elements(this.name),
        //The oposing character, just easier to type vs than oponent
        this.vs = null,
        this.active = false,
        this.fighter_list = null,
        this.current_stats = null;
    }
    set oponent(vs){
        this.vs = vs;
    }
    set stats(stats_index){
        if(stats_index >= 0){
            this.current_stats = this.fighter_list[stats_index];
            let keys = Object.keys(this.current_stats);
            for(let i =0; i < keys.length;i++){
                try{
                    this.set_stat_element(keys[i],this.current_stats[keys[i]]);
                }
                catch(err){
                    console.debug(err);
                    console.debug(`${keys[i]} - ${this.current_stats[keys[i]]}`);
                }
            }
        }
    }
    set_stat_element(stat_name,value){
        try{
            this.elements[stat_name].removeChild(this.elements[stat_name].children[0]);
        }
        catch(err){
            console.debug(err);
        }
        this.elements[stat_name].innerHTML = value;
    }
    find_elements(name){
        let player_items = document.getElementsByClassName(name);
        let player_elements = {}
        for (let i = 0; i < player_items.length; i++){
            player_elements[player_items[i].dataset.name] = player_items[i]
        }  
        return player_elements;
    }
}

$.post("fighter_stats",
    {
    },
    function(data,status){
        let fighter_stats = data.splice(0);
        player1.fighter_list = fighter_stats;
        player2.fighter_list = fighter_stats;
        set_fighter_selections(fighter_stats);
    });

function set_fighter_selections(fighter_stats){
    let selections = document.getElementsByName("character_select");
    for(let i=0;i<selections.length;i++){
        fighter_stats.forEach(function(fighter){
            let op = document.createElement("option");
            let txt = document.createTextNode(fighter.name)
            op.value = fighter.fighter_id;
            op.classList.add("dropdown-item");
            op.appendChild(txt);
            selections[i].appendChild(op);
        });
    }
}


const player1 = new fighter("player1");
player1.active = true;
const player2 = new fighter("player2");
player2.active = false;
player1.oponent = player2;
player2.oponent = player1;

document.getElementById("player1_select").addEventListener("change",function(){
    let self_value = this.options[this.selectedIndex].value;
    post_query(self_value).done(function(data) {
        player1.movelist = data.splice(0);
        document.dispatchEvent(new CustomEvent("attacker_selected",{
            bubbles:false,
            detail:{movelist:player1.movelist,fighter:player1},
        }));
    });

});
document.getElementById("player2_select").addEventListener("change",function(){
    let self_value = this.options[this.selectedIndex].value;
    post_query(self_value).done(function(data) {
        player2.movelist = data.splice(0);
        document.dispatchEvent(new CustomEvent("defender_selected",{
            bubbles:false,
            detail:{movelist:player2.movelist},
        }));
    });

});

function post_query(value){
    return $.post("query",
    {
      fighter_id: value
    });
}

function remove_children(element){
    while(element.children.length >0){
        element.removeChild(element.children[0]);
    }
    return element;
}

const events = ['move_selected','move_unselected','attacker_selected','attacker_unselected','defender_selected'];

function add_document_listeners(events){
    events.forEach(function(event){
        document.addEventListener(event,(e)=>{
            let listeners = document.querySelectorAll(`[data-listener~=${event}]`);
            let ce = new CustomEvent(event,e);
            listeners.forEach(function(element){
                element.dispatchEvent(ce);
            });
        });
    });
}
function change_collapse(col){
    let len = col.dataset.max_height *-1;
    col.style.maxHeight = ((len < 0) ? "0px" : len+"px");
    col.dataset.max_height *= -1;
    col.classList.toggle("collapsed")
}
function show_collapse(col){
    let len = ((col.dataset.max_height < 0) ? col.dataset.max_height *-1: col.dataset.max_height);
    col.style.maxHeight = len+"px";
    col.dataset.max_height = len;
    col.classList.remove("collapsed");
}
function hide_collapse(col){
    let len = ((col.dataset.max_height > 0) ? col.dataset.max_height *-1: col.dataset.max_height);
    col.style.maxHeight = "0px";
    col.dataset.max_height = len;
    col.classList.add("collapsed");
}
function set_max_height(cols){
    if (cols.classList.contains("collapsed")) {
        cols.style.maxHeight = "0px";
        cols.dataset['max_height'] = cols.scrollHeight * -1;
      }
      else {
        cols.style.maxHeight = cols.scrollHeight + "px";
        cols.dataset['max_height'] = cols.scrollHeight;
      }
      cols.classList.remove("hidden");
  }
//function add_same_response(events,object){
//    events.forEach((event)=>{
//        object.addEventListener(event,object);
//    });
//}
add_document_listeners(events);

document.getElementById("selected_move_row").addEventListener("move_selected",function(e){
    let self = this;
    remove_children(self);
    let item = e.detail.item;
    let values = [item.move_name,item.startup,item.active,item.recovery,item.on_hit,item.on_block];
    values.forEach(function(value){
        let element = document.createElement("td");
        element.innerHTML = value;
        self.appendChild(element);
    });
    let t = document.getElementById("selected_move_table");
    set_max_height(t);
    change_collapse(document.getElementById("selected_move_table"));
});

document.getElementById("selected_move_row").addEventListener("click",function(){
    document.dispatchEvent(new CustomEvent("move_unselected",{bubbles:false}));
    change_collapse(document.getElementById("selected_move_table"));
});

document.getElementById("punish_moves").addEventListener("defender_selected",function(e){
    console.log('in punish updater');
    let self = this;
    remove_children(self);
    let movelist = e.detail.movelist;
    let sections = {};
    //TypeError when movelist is null
    for(let i =0;i<movelist.length;i++){
        let li = document.createElement("li");
        li.innerHTML=`${movelist[i].move_name}`;
        try{
            sections[movelist[i].startup].children[1].append(li);
        }
        catch(err){
            if(err.name == "TypeError"){
                let row = document.createElement("div");
                row.setAttribute('class','row hidden punish_row');
                row.setAttribute('data-value',movelist[i].startup)
                let btn = document.createElement("h3");
                btn.setAttribute('class','button punish_button');
                btn.innerHTML = `${movelist[i].startup} Frame Punish`;
                let ul = document.createElement("ul");
                ul.setAttribute('class',"collapsible collapsed menu-list");
                btn.addEventListener("click",function(){
                    change_collapse(ul);
                });
                row.appendChild(btn);
                row.appendChild(ul);
                row.children[1].append(li);
                sections[movelist[i].startup] = row;
            }
        }
    }
    Object.keys(sections).forEach(function(row){
        self.appendChild(sections[row]);
    });
    let selected_table = document.getElementById("selected_move_table");
    if(!selected_table.classList.contains('collapsed')){
        let on_block = document.getElementById('selected_move_row').lastChild.innerHTML;
        this.dispatchEvent(new CustomEvent("move_selected",{
            bubbles: false,
            detail:{item:{on_block:on_block}}
        }));
    }
});

document.getElementById("punish_moves").addEventListener("move_selected",function(e){
    console.log('showing punish moves');
    let rows = document.getElementsByClassName("punish_row");
    let on_block = parseInt(e.detail.item.on_block) *-1;
    console.log(on_block);
    for (let i = 0; i < rows.length; i++){
        if(parseInt(rows[i].dataset.value) <= on_block){
            rows[i].classList.remove('hidden');
            set_max_height(rows[i].children[1]);
        }
    }
});

document.getElementById("punish_moves").addEventListener('move_unselected',function(e){
    let rows = document.getElementsByClassName("punish_row");
    for (let i = 0; i < rows.length; i++){
        rows[i].classList.add('hidden');
        rows[i].classList.remove('active');
        hide_collapse(rows[i].children[1]);
    }
});
//add_same_response(['move_unselected','attacker_unselected'],
//    document.getElementById("punish_moves"),function(){
//        remove_children(this);
//})

document.getElementById("move_table").addEventListener("move_unselected",function(e){
    change_collapse(this);
});
document.getElementById("move_table").addEventListener("move_selected",function(e){
    change_collapse(this);
});

document.getElementById("table_body").addEventListener("attacker_unselected",function(e){
    remove_children(this);
});
document.getElementById("table_body").addEventListener("attacker_selected",function(e){
    console.log('making table');
    let self = this;
    let movelist = e.detail.movelist;
    let fighter = e.detail.fighter;
    remove_children(self);
    for(let i =0; i < movelist.length;i++){
        let item = movelist[i];
        let row = document.createElement("tr");
        row.name = "move_row";
        row.setAttribute('data-value',i);
        row.setAttribute('class','menu-items');
        let values = [item.move_name,item.startup,item.active,item.recovery,item.on_hit,item.on_block];
        values.forEach(function(value){
            let element = document.createElement("td");
            element.innerHTML = value;
            row.appendChild(element);
        });
        row.addEventListener("click",function(){
            document.dispatchEvent(
                new CustomEvent("move_selected",{
                    bubbles: false,
                    detail: {item: item,fighter:fighter},
                })
            );
        });
        self.appendChild(row);
    }
    let tb = document.getElementById("move_table");
    set_max_height(tb);
    show_collapse(tb);
});


