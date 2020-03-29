grammar mql;

NUMBER
	: DIGIT+
	| DIGIT+ '.' DIGIT+
	| ('0x' | '0X') (DIGIT | [a-fA-F])+
	| 
	;

fragment DIGIT : [0-9];
fragment LETTER : [a-zA-Z];