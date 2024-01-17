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
            self.post_query(self_value);
            
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

const events = ['move_selected','move_unselected','attacker_selected'];

function add_listeners(events){
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
add_listeners(events);

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
});

document.getElementById("selected_move_row").addEventListener("click",function(){
    document.dispatchEvent(new CustomEvent("move_unselected",{bubbles:false}));
});

document.getElementById("punish_moves").addEventListener("move_selected",function(e){
    let self = this;
    remove_children(self);
    let item = e.detail.item;
    let on_block = parseInt(item.on_block) * -1
    let movelist = e.detail.fighter.vs.movelist;
    for(let i =0;i<movelist.length;i++){
        if(movelist[i].startup <= on_block){
            let li = document.createElement("li");
            li.innerHTML=`${movelist[i].move_name} - ${movelist[i].startup} Frames - ${movelist[i].input}`;
            self.append(li);
        }
    }
});
document.getElementById("punish_moves").addEventListener("move_unselected",function(e){
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
        row.setAttribute('data-bs-toggle',"collapse");
        row.setAttribute('data-bs-target',"#move_table");
        row.setAttribute('data-value',i);
        //row.setAttribute('data-listener','move_selected')
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
