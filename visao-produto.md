# Visão de Produto — "Recado Surpresa": Um Presente Verdadeiramente Magnífico

> Este documento não é uma lista de features. É a arquitetura emocional que deve orientar toda decisão de produto daqui pra frente — visual, técnica e de copy. Qualquer feature nova deve ser testada contra este documento antes de entrar no roadmap: **ela aprofunda algum destes gatilhos, ou só adiciona complexidade?**
>
> Camada de decisão **acima** da [`especificacao-presente-surpresa.md`](./especificacao-presente-surpresa.md) e do [`plano-implementacao.md`](./plano-implementacao.md). A seção 8 mapeia onde cada ideia daqui já virou tarefa concreta.

---

## 1. O que "magnífico" significa aqui (e o que NÃO significa)

Magnífico não é "ter muitas opções". É a pessoa sentir, nos primeiros 3 segundos depois de escanear o QR, que **alguém pensou nela especificamente** — não que baixou um template.

O maior risco deste produto não é ser simples demais. É ser **genérico e piegas**: uma tela com corações, fonte cursiva e frase de para-choque de caminhão. Isso destrói a credibilidade emocional instantaneamente — o pai sente que é um produto de massa fingindo ser pessoal, o efeito contrário do pretendido.

**Princípio-guia:** cada escolha de design deve reduzir a "distância" entre o comprador e o pai, nunca aumentar a distância entre o produto e a realidade da relação deles. Especificidade > estética. Um detalhe real e pequeno ("a camisa do Vasco que você nunca tira") vale mais que dez adjetivos bonitos.

---

## 2. Os três gatilhos emocionais centrais (e por que cada um importa)

### Gatilho 1 — Efeito IKEA: o comprador precisa *construir*, não preencher
Pessoas valorizam mais aquilo em que investiram esforço próprio. Um formulário que só pede "escreva uma mensagem" produz um resultado genérico porque exige esforço criativo do zero — e a maioria trava e escreve algo raso. Em vez disso, o produto deve **guiar a construção em pequenos passos concretos** (uma pergunta de cada vez, nunca um campo de texto em branco assustador), fazendo o comprador sentir que *fez* algo, não que preencheu um form.

**Aplicação prática:** perguntas específicas e evocativas em vez de um campo aberto — "qual frase ele sempre repete que te irrita e ao mesmo tempo é a cara dele?", "conta uma vez em que ele demonstrou ficar orgulhoso de você sem dizer com palavras" — cada resposta vira automaticamente um bloco de conteúdo na página, sem que o comprador precise "escrever bonito".

### Gatilho 2 — Zeigarnik: a mente não descansa enquanto algo está incompleto
Uma tarefa iniciada e não terminada ocupa a mente mais que uma tarefa concluída. A contagem regressiva (revelação agendada) não é só um efeito bonito — ela **mantém o comprador emocionalmente engajado com o presente até o dia**, e transforma o momento da abertura pelo pai num evento com peso, não um link qualquer aberto de qualquer jeito.

**Aplicação prática:** o comprador recebe (opcionalmente) um lembrete no dia — "faltam 2 dias para o [nome] ver a surpresa" — reforçando a expectativa em vez de deixar o produto esquecido numa aba.

### Gatilho 3 — Reciprocidade + fechamento do ciclo: a emoção precisa voltar
O momento mais forte deste produto não é o pai ver a página. É o **filho saber que o pai viu e sentiu algo**. Sem esse retorno, a experiência emocional do comprador (quem pagou) fica pela metade — ele nunca sabe se "funcionou".

**Aplicação prática:** uma reação simples do pai (emoji, ou um áudio de 10 segundos gravado direto na página) que volta como notificação para o comprador. Isso fecha o loop e é, sozinho, o maior gerador de "vou fazer um pra minha mãe também" — porque o comprador *sentiu o resultado*, não só imaginou.

---

## 3. A jornada emocional completa (não é a jornada de cliques — é a jornada de sentimento)

| Momento | O que a pessoa sente hoje (produto genérico) | O que deve sentir (produto magnífico) |
|---|---|---|
| Vê o anúncio/link | "mais um produto de presente" | "espera, isso é diferente" — copy que nomeia a dor exata ("não sabe o que dar? claro que não sabe, presente não é sobre objeto") |
| Preenche o formulário | tarefa chata, campo de texto vazio intimidando | perguntas curtas e específicas, uma de cada vez, sente que está "descobrindo" o que quer dizer, não "inventando" |
| Vê o preview | "ok, ficou bonitinho" | "caramba, ficou bonito de verdade" — pela primeira vez ele **vê** o presente tomando forma, não um formulário |
| Paga | ansiedade ("será que vai dar certo?") | confiança — status claro, sem incerteza sobre se o pagamento "sumiu" |
| Espera até o dia (se agendado) | esquece que comprou | pequeno lembrete reacende a expectativa |
| Entrega o QR/cartão físico | "toma, é um presente" (sem graça) | mistério — o pai não sabe o que é, só que precisa escanear |
| Pai escaneia | abre uma página qualquer | cerimônia — contagem, depois um pequeno gesto de "abertura" (não instantâneo, um respiro de 2-3s), então o conteúdo aparece |
| Pai vê o conteúdo | fotos + texto genérico | uma sequência com ritmo, cada momento revelado aos poucos, trilha sonora sutil, linguagem que soa como o filho fala de verdade (porque veio das perguntas específicas do gatilho 1) |
| Pai reage | nada acontece, fim | ele pode deixar uma reação simples que volta pro filho — o ciclo fecha |
| Filho recebe a reação | nunca sabe se funcionou | notificação: "seu pai abriu e reagiu ❤️" — o pico emocional do comprador, não do pai |

Isso é o **Peak-End Rule** aplicado: as pessoas lembram de uma experiência pela emoção no pico e no final, não pela média. O produto de hoje não tem pico nem final — é um platô. A versão magnífica precisa de um pico claro (a revelação) e um final claro (a reação de volta).

---

## 4. Possibilidades de conteúdo — organizadas por esforço de produção vs. peso emocional

Não é sobre ter todas — é sobre saber qual usar em cada caso.

### Essencial (todo comprador usa)
- Fotos com legenda curta e específica por foto (não um bloco de fotos genérico)
- Mensagem construída por perguntas guiadas (gatilho 1), não campo livre
- Trilha sonora ambiente sutil, ligada ao tema *(nota de execução: navegadores móveis bloqueiam autoplay com som — o som só pode nascer do gesto de "abrir o presente"; na dúvida, silêncio)*

### Alto impacto, esforço médio
- Áudio do comprador (10-30s) — a própria voz é mais pessoal que texto perfeito. Tecnicamente mais simples que vídeo, quase o mesmo peso emocional
- Reação do pai de volta (áudio curto ou emoji) — fecha o ciclo (gatilho 3)
- Assistente de escrita com IA como *apoio*, nunca substituição — a IA sugere frases a partir das respostas guiadas, o comprador escolhe/edita, nunca gera do zero sem input pessoal (isso quebraria o efeito IKEA)

### Alto impacto, mais esforço técnico (avaliar caso a caso)
- Vídeo curto do comprador
- Playlist de música com significado (não só trilha ambiente — músicas que "são a cara" da relação)

### Evitar (baixo retorno emocional, risco de parecer genérico)
- Frases de efeito prontas/genéricas ("um pai é um herói que...") — diferente do que sai das perguntas específicas do comprador
- Excesso de opções de customização visual (paralisia de escolha — Lei de Hick) — poucos temas, bem feitos, é melhor que muitos temas medianos

---

## 5. O momento "uau" da revelação — merece ser tratado como cerimônia, não como transição de tela

Hoje: contagem regressiva → some → conteúdo aparece. Funcional, mas sem peso.

Versão magnífica, em camadas (da mais simples à mais elaborada):
1. **Camada mínima:** ao zerar, uma transição com leve som e movimento (não instantâneo) — como abrir um envelope, não trocar de aba
2. **Camada intermediária:** o nome do destinatário aparece primeiro, sozinho, por 1-2s, antes de qualquer outra coisa — cria um instante de reconhecimento pessoal antes do conteúdo
3. **Camada elaborada:** a revelação é sequencial, não tudo de uma vez — primeiro a mensagem principal, depois as fotos/memórias uma a uma, criando ritmo de leitura em vez de um mural

**Padrão de lançamento: camada intermediária** — barata de implementar e já eleva muito a percepção, sem o risco técnico da camada elaborada.

---

## 6. Como isso muda a oferta (sem inflar preço nem opções)

Em vez de "planos" por funcionalidade (que gera contradição, como a auditoria da especificação já apontou), pensar em **um produto único e completo**, com o preço ancorado não em "quantas fotos" mas na **transformação emocional**: *"o presente que ele vai lembrar, não o que ele vai guardar na gaveta"*. A âncora de preço ("menos que uma meia, infinitamente mais memorável") continua válida e deve aparecer perto da explicação das perguntas guiadas — é ali que a pessoa entende que não está comprando um template.

---

## 7. Riscos de execução (o que pode transformar "magnífico" em "cringe")

| Risco | Como evitar |
|---|---|
| Perguntas guiadas genéricas demais | Escrever perguntas que soem como algo que um amigo perguntaria, não um formulário de RH — testar lendo em voz alta |
| Música genérica de banco de áudio "emotivo" | Escolher poucas faixas, discretas, quase imperceptíveis — o silêncio é melhor que uma trilha piegas |
| Animação de revelação exagerada (confete, brilho, emojis flutuantes) | Menos é mais — um pai de 55-70 anos não é o público de uma estética de app de gamificação |
| IA gerando frases prontas sem base nas respostas do comprador | A IA só pode operar em cima do que o comprador escreveu — nunca gerar do zero |
| Muitos temas medianos em vez de poucos temas excelentes | Um tema muito bem executado > três temas genéricos |

---

## 8. Como isso se conecta ao que já está em desenvolvimento

Este documento não substitui a especificação técnica nem o plano de implementação — ele é a camada de decisão **acima** dos dois. Ao decidir o que entra em cada fase, cada item deve ser avaliado contra as seções 2 e 3: *isso aprofunda um gatilho emocional real, ou só adiciona uma feature?*

Estado da integração (13/07/2026):

| Ideia desta visão | Onde virou execução |
|---|---|
| Perguntas guiadas substituindo o campo livre (gatilho 1) | Especificação RF01 + plano **T1.2** (inclui o roteiro inicial das perguntas, pendente de aprovação — decisão D9) |
| Legendas por foto | RF01 + plano T1.2; modelo de dados `midias: [{url, legenda}]` |
| Cerimônia de revelação — camada intermediária (seção 5) | RF15 + plano **T2.1** (toque para abrir, nome primeiro, transição suave) |
| Reação do pai fechando o ciclo (gatilho 3) | RF16 + plano **T2.7** (emoji no MVP; áudio fica para v2) |
| Lembrete pré-revelação (gatilho 2) | Plano **T2.8** (🟡 só se sobrar prazo; reusa o cron da limpeza) |
| Trilha sonora sutil | Dobrada dentro da cerimônia (T2.1): som só via gesto de abertura, opcional; sem asset excelente, silêncio |
| Áudio do comprador, IA de apoio à escrita, playlist, vídeo | v2 — registrados no "Fora do MVP" da especificação |
| Convidar a família a contribuir (amplia o gatilho 1 — mais gente investe esforço próprio) | Plano **Fase 5 — Surpresa Coletiva** (16/07/2026): link pós-pagamento, mensagens curtas moderadas pelo comprador, exibidas logo após o clímax |
