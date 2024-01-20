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
        this.attacker_button_listener(this.elements.attacker_button);
        this.character_select_listener(this.elements.character_select);
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
    character_select_listener(item){
        let self = this;
        item.addEventListener("change",function(){
            let self_value = item.options[item.selectedIndex].value;
            self.stats = item.selectedIndex-1;
            if(self_value != "null"){
                self.post_query(self_value);
            }
            if(self.active){
                document.dispatchEvent(new CustomEvent("move_unselected"))
            }
            
        });
    }
    attacker_button_listener(item){
        let vs = this.vs;
        let self = this;
        item.addEventListener("click",function(){
            item.classList.add("active");
            self.active = true;
            vs.elements.attacker_button.classList.remove("active");
            vs.active = false;
            document.dispatchEvent(new CustomEvent("attacker_selected",{
                bubbles:false,
                detail:{movelist:self.movelist,fighter:self},
            }));
            document.dispatchEvent(new CustomEvent("move_unselected"));
            //self.set_move_table();
        });
    }
    move_select_listener(item){

    }
    post_query(value){
        let self = this;
        $.post("query",
        {
          fighter_id: value
        },
        function(data,status){
            console.log(status);
            self.movelist = data.splice(0);
            self.elements.attacker_button.classList.remove("hidden");
            if(self.active){
                document.dispatchEvent(new CustomEvent("attacker_selected",{
                    bubbles:false,
                    detail:{movelist:self.movelist,fighter:self},
                }));
            }
        });
    }
}

const player1 = new fighter("player1");
const player2 = new fighter("player2");
player1.oponent = player2;
player2.oponent = player1;

function remove_children(element){
    while(element.children.length >0){
        element.removeChild(element.children[0]);
    }
    return element;
}

const events = ['move_selected','move_unselected','attacker_selected','attacker_unselected'];

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

document.getElementById("punish_moves").addEventListener("move_selected",function(e){
    console.log('in punish updater');
    let self = this;
    remove_children(self);
    let h = document.createElement("h2");
    h.innerHTML="Punish Moves";
    self.append(h);
    let item = e.detail.item;
    let on_block = parseInt(item.on_block) * -1;
    let movelist = e.detail.fighter.vs.movelist;
    let sections = {};
    //TypeError when movelist is null
    for(let i =0;i<movelist.length;i++){
        if(movelist[i].startup <= on_block){
            let li = document.createElement("li");
            li.innerHTML=`${movelist[i].move_name}`;
            try{
                sections[movelist[i].startup].children[1].append(li);
            }
            catch(err){
                if(err.name == "TypeError"){
                    let row = document.createElement("div");
                    row.setAttribute('class','row');
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
    }
    Object.keys(sections).forEach(function(row){
        self.appendChild(sections[row]);
        set_max_height(sections[row].children[1]);
    });
});
document.getElementById("punish_moves").addEventListener('move_unselected',function(e){
        remove_children(this);
        let h = document.createElement("h2");
        h.innerHTML="Punish Moves";
        this.append(h);
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
});

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
