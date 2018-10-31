class Card
{
	isOpen : boolean
	color  : string
	name   : string
	el     : HTMLElement
	stack  : Stack

	constructor(
		public game   : Klondike,
		public id     : any,
		public suit   : string,
		public number : number
	){
		this.isOpen = true

		if(suit == "♥" || suit == "♦")
			this.color = "red"
		else
			this.color = "black"

		if(this.number == 1)
			this.name = "a"
		else if(this.number < 11)
			this.name = this.number.toString()
		else switch (this.number) {
			case 11: this.name = "j"; break;
			case 12: this.name = "q"; break;
			case 13: this.name = "k"; break;
			default: "idk"
		}

		this.el = document.createElement("div")
		this.el.className = "card " + this.color
		this.el.setAttribute("draggable", "true")
		this.el.ondragstart = e => {
			e.stopPropagation()
			this.game.take(this)
			e.dataTransfer.setData("text", "help");
		}
		this.el.ondragend = e => this.game.clearHolding()
		this.el.onclick = e => {
			e.preventDefault()
			
			if(!this.isOpen && this.stack.manualOpen && this.stack.topCard == this){
				this.open()
				this.stack.render()
				return
			}
			if(this.isOpen){
				e.stopPropagation()
				if(this.game.holding.length == 0 ||!this.stack.put(this.game.holding))
					this.game.take(this)
			}
		}
	}

	open(){
		this.game.addToHistory({
			verse: [this, this.open],
			reverse: [this, this.close]
		})
		this.isOpen = true
	}

	close(){
		this.game.addToHistory({
			verse: [this, this.close],
			reverse: [this, this.open]
		})
		this.isOpen = false
	}

	pop(){
		if(this.stack){
			this.stack.remove(this)
			this.stack = null
		}
		return this
	}
}

class Stack
{
	cards	   : Card[]
	manualOpen : boolean 
	isOpen     : boolean
	canDrop    : Function
	canDrag    : Function

	constructor(
		public game : Klondike,
		public el   : HTMLElement
	){
		this.cards = []
		
		this.manualOpen = el.getAttribute("manual-open") === "true"? true : false

		if(el.getAttribute("open") === "true")
			this.isOpen = true
		else if (el.getAttribute("open") === "false")
			this.isOpen = false

		this.setDragDrop()

		this.el.ondragover = e => {
			e.preventDefault()
		}
		this.el.ondrop = e => {
			e.preventDefault()
			const cards = this.game.holding
			this.put(cards)
		}
		this.el.onclick = e => {
			e.preventDefault()
			if(this.game.holding.length == 0) return
			const cards = this.game.holding
			this.put(cards)
		}
	}

	put(cards){
		this.game.clearHolding()

		const canDrop = this.canDrop(cards, this.topCard)
		
		if(canDrop){
			this.addMany(cards)
			return true
		}
		return false
	}

	setDragDrop(){
		const canDragAttr = this.el.getAttribute("can-drag")
		if(canDragAttr === "true")
			this.canDrag = ()=>true
		else if(canDragAttr === "false")
			this.canDrag = ()=>false
		else
			this.canDrag = Stack[canDragAttr]

		const canDropAttr = this.el.getAttribute("can-drop")
		if(canDropAttr === "true")
			this.canDrop = ()=>true
		else if(canDropAttr === "false")
			this.canDrop = ()=>false
		else
			this.canDrop = Stack[canDropAttr]
	}

	get topCard(){
		return this.cards[this.cards.length-1]
	}

	add(card, dontRender=false){
		if(!this.game.settingUp)
			this.game.addToHistory({
				verse: [this, this.add, card, dontRender],
				reverse: [card.stack, card.stack.add, card, dontRender]
			})

		this.cards.push(card.pop())
		card.stack = this
		if(this.isOpen != undefined)
			card.isOpen = this.isOpen

		if(!dontRender)
			this.render()
	}
	addMany(cards){
		for(const card of cards){
			this.add(card,true)
		}
		this.render()
	}
	remove(card){
		const index = this.cards.indexOf(card)
		this.cards.splice(index, 1)
	}

	shuffle(){
		for(let i = 0; i < this.cards.length; i++){
			const buffer = this.cards[i]
			const otherI = Klondike.randInt(i, this.cards.length)

			this.cards[i] = this.cards[otherI]
			this.cards[otherI] = buffer
		}
	}

	render(){
		for(const card of this.cards){
			if(card.isOpen){
				card.el.classList.remove("hidden")
				card.el.innerText = card.name + " " + card.suit
			}
			else{
				card.el.classList.add("hidden")
				card.el.innerText = ""
			}
			this.el.appendChild(card.el)
		}
	}


	static dragCol(card){
		return card.isOpen
	}

	static dropGoal(holding, topStack){
		if(topStack){
			if(holding.length == 1
			&& holding[0].suit == topStack.suit
			&& holding[0].number == topStack.number + 1)
				return true
		}
		else if(holding.length == 1 && holding[0].name == "a")
			return true
		return false
	}
	static dropCol(holding, topStack){
		if(topStack){
			if(holding[0].color != topStack.color
			&& holding[0].number == topStack.number - 1
			&& topStack.isOpen)
				return true
		}
		else if(holding[0].name == "k")
			return true
		return false
	}
}

class Klondike
{
	settingUp : boolean
	rewinding : boolean
	history   : {verse:[Object,Function,any],reverse:[Object,Function,any]}[]
	holding   : Card[] = []
	cards     : Card[]
	stacks    : {[key: string]: Stack}

	constructor(public el : HTMLElement){
		this.settingUp = true

		this.rewinding = false
		this.history = []
		this.cards = this.makeCards()
		this.stacks = this.makeStacks()
		this.start()

		this.settingUp = false
	}

	take(card){
		const canDrag = card.stack.canDrag(card)
		if(!canDrag) return;

		const cardsInStack = card.stack.cards
		const cards = []
		for(let i = cardsInStack.indexOf(card); i < cardsInStack.length; i++){
			const card = cardsInStack[i]
			cards.push(card)
			card.el.classList.add("drag")
		}

		for(const key of Object.keys(card.game.stacks)){
			if(isNaN(Number(key))) continue;
			const stack = this.stacks[key]
			const canDrop = stack.canDrop(cards, stack.topCard)
			if(canDrop)
				stack.el.classList.add("can-drop")
		}

		this.holding = cards.length!=0? cards : []
	}

	clearHolding(){
		for(const key of Object.keys(this.stacks)){
			if(isNaN(Number(key))) continue;
			const stack = this.stacks[key]
			stack.el.classList.remove("can-drop")
		}

		const cards = this.holding

		for(const card of cards)
			card.el.classList.remove("drag")

		this.holding = []
	}

	addToHistory(record){
		if(!this.rewinding && !this.settingUp)
			this.history.push(record)
	}

	rewind(){
		if(this.history.length == 0) return
		
		this.rewinding = true

		const {reverse} = this.history.pop()
		console.log(reverse)
		const self = reverse.shift()
		reverse.shift().apply(self, reverse)

		this.rewinding = false
		this.render()
	}

	makeCards(){
		const cards = []
		let i = 0
		for(const suit of ["♥","♦","♣","♠"])
			for(let number = 1; number <= 13; number++)
				cards.push(new Card(this, i++, suit, number))
		return cards
	}

	makeStacks(){
		const stacks = {}
		document.querySelectorAll(".stack").forEach((el:HTMLElement,index) => {
			const stack = new Stack(this, el)
			stacks[index] = stack
			if(el.id)
				stacks[el.id] = stack
		})
		return stacks
	}

	start(){
		const deck = this.stacks.deck
		deck.addMany(this.cards)
		deck.shuffle()

		for(let i = 1; i <= 7; i++){
			const stack = this.stacks[i+5]
			stack.addMany(deck.cards.slice(deck.cards.length-i))
			stack.topCard.isOpen = true
		}

		deck.el.onclick = () => {
			const draw = this.stacks.draw
		
			if(deck.cards.length)
				draw.add(deck.topCard)
			else{
				for(let i = draw.cards.length-1; i >= 0; i--)
					deck.add(draw.cards[i], true)
				deck.render()
			}
		}

		const rewind : HTMLElement = this.el.querySelector("#rewind")
		rewind.onclick = ()=>{
			this.rewind()
		}

		this.render()
	}

	render(){
		for(const key of Object.keys(this.stacks))
			if(Number(key))
				this.stacks[key].render()
			else
				continue
	}


	static randInt(min,max){
		return Math.floor(Math.random() * (max - min) + min)
	}
}

const k = new Klondike(document.getElementById("game"))
console.log(k)