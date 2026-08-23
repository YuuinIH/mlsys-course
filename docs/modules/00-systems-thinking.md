# 0. 为啥需要 MLSys？

假设你是一个刚入职不久的工程师。

某天，老板在会议上刷到了某个最新最炫的 DeepSeek 模型。

他突然沉默了三分钟，然后抬头说：

“小王啊，最近这个 DeepSeek 很火。”  
“嗯。”  
“集团领导也很重视。”  
“嗯……”  
“你看我们是不是也应该有自己的大模型？”  
“……”  
“不用搞那么复杂，先在你电脑上搞一个出来看看。”

会议室里没人说话。

同事们不约而同地看向一脸茫然的你。

![领导提出先在办公电脑上部署大模型，工程师看向桌下主机的场景插图](/images/modules/00/office-ai-request.svg)

<small>很多 ML system 的故事，并不是从一座数据中心开始的，而是从一句“先在你电脑上试试”开始的。<sup>[[3]](#ref-course-diagrams)</sup></small>

你无奈地回到工位，看了一眼桌子下面那台电脑：

```text
CPU: AMD Ryzen 7 9700X
RAM: 64 GB DDR5
GPU: NVIDIA GeForce RTX 5070 12 GB
SSD: 2 TB NVMe SSD
```

配置其实还算可圈可点。

只不过在过去的大半年里，它最繁重的工作大概是同时开着浏览器、Excel、企业微信，以及几个不知道为什么一直不能关的 OA 页面。

好消息是，至少“先跑起来看看”这件事，没有想象中困难。

查了几页文档，又问了几次 ChatGPT，不到半小时，你拼出了人生中第一个“大模型平台”：

```python
from transformers import AutoTokenizer, AutoModelForCausalLM

model_name = "Qwen/Qwen3-4B"

tokenizer = AutoTokenizer.from_pretrained(model_name)

model = AutoModelForCausalLM.from_pretrained(
    model_name,
    device_map="auto",
    torch_dtype="auto"
)

messages = [
    {
        "role": "user",
        "content": "请用两句话介绍一下我们单位为什么应该重视人工智能。"
    }
]

text = tokenizer.apply_chat_template(
    messages,
    tokenize=False,
    add_generation_prompt=True
)

inputs = tokenizer(
    text,
    return_tensors="pt"
).to(model.device)

outputs = model.generate(
    **inputs,
    max_new_tokens=128
)

answer = tokenizer.decode(
    outputs[0][inputs["input_ids"].shape[1]:],
    skip_special_tokens=True
)

print(answer)
```

下载模型。

加载。

等待。

然后，它真的开始往外吐字了。

不一会儿，领导来了。

“弄得怎么样了？”

“能跑了。”

你把问题改成：

> 请写一段关于“人工智能赋能企业高质量发展”的介绍，200 字以内。

模型稍微思考了一下：

> 随着人工智能技术的快速发展，人工智能正在成为推动企业数字化转型和高质量发展的重要力量。通过引入人工智能技术，企业可以提高生产效率，优化业务流程，降低运营成本，并进一步提升管理水平和创新能力……

领导看完：

“哎，这不挺好吗？”

“嗯，模型比较小，能力有限，就是先跑起来看看。”

“这个是我们自己的吗？”

你想了想。

“模型是开源的，现在下载在本机运行，数据没有发出去。”

领导显然只听进去了两个关键词：

**开源。**

**本地。**

然后满意了。

“不错，至少说明这个路线能走。”

你刚准备松一口气。

“那你整理一下，明天给部门里的人也试试。”

“……”

## 0.1 昨天你有一个模型，今天你有一个服务

第二天早上，你决定给模型套一层 API。

毕竟，你总不能让部门里的每一个人都搬着椅子坐到你的工位旁边，在你的终端里输入 prompt。

于是你写了一段依赖 FastAPI的小服务：

```python
from fastapi import FastAPI
from pydantic import BaseModel
from transformers import AutoTokenizer, AutoModelForCausalLM

app = FastAPI()

model_name = "Qwen/Qwen3-4B"

tokenizer = AutoTokenizer.from_pretrained(model_name)
model = AutoModelForCausalLM.from_pretrained(
    model_name,
    device_map="auto",
    torch_dtype="auto"
)

class ChatRequest(BaseModel):
    prompt: str

@app.post("/chat")
def chat(request: ChatRequest):
    messages = [
        {"role": "user", "content": request.prompt}
    ]

    text = tokenizer.apply_chat_template(
        messages,
        tokenize=False,
        add_generation_prompt=True
    )

    inputs = tokenizer(
        text,
        return_tensors="pt"
    ).to(model.device)

    outputs = model.generate(
        **inputs,
        max_new_tokens=128
    )

    answer = tokenizer.decode(
        outputs[0][inputs["input_ids"].shape[1]:],
        skip_special_tokens=True
    )

    return {"answer": answer}
```

然后：

```bash
pip install fastapi uvicorn transformers torch

uvicorn app:app --host 0.0.0.0 --port 8000
```

只要能够访问你的电脑，同事现在就可以：

```bash
curl -X POST http://你的IP:8000/chat \
  -H "Content-Type: application/json" \
  -d '{"prompt":"请帮我写一段年度工作总结"}'
```

得到：

```json
{
  "answer": "过去一年，在部门领导的正确指导下……"
}
```

好了。

昨天，你有一个模型。

今天，你有了一个 HTTP 服务。

事情似乎依然没有变得多复杂。

## 0.2 然后，真的有人用了

结果你没想到，部门里的同事居然真的开始狂热地使用这个东西。

上午十点。

“帮我写一段年度工作总结。”

模型回答了。

“帮我把这份材料润色一下。”

也很快。

“这段话帮我写正式一点。”

“总结一下这个文件。”

“帮我扩写一下领导讲话。”

你坐在工位上，看着群里的反馈，甚至开始产生一种升职加薪指日可待的错觉。

直到第三个人、第四个人、第五个人几乎同时点下发送。

事情开始不太对劲。

有人在群里 @ 你：

> “是不是卡了？”

另一个人说：

> “我这边转半天了。”

还有人说：

> “刚才不是挺快的吗？”

你皱了皱眉，打开监控。

服务没挂。

程序没有报错。

GPU 很忙。

CPU 也没闲着。

显存占了不少。

那个昨天还让领导十分满意的小模型也依然在坚持工作。

只是现在它每生成一个 token，都仿佛要经历一次完整的宇宙大爆炸：<sup>[[1]](#ref-galaxy-brain)</sup>

| 请求排到第几位 | 模型此刻的精神状态 |
| --- | --- |
| 第一个请求 | **思考。**<br><img src="/images/modules/00/galaxy-brain-m-stage-1.jpg" alt="Galaxy Brain 第一阶段：普通思考" width="320" loading="lazy"> |
| 第二个请求 | **顿悟。**<br><img src="/images/modules/00/galaxy-brain-m-stage-2.jpg" alt="Galaxy Brain 第二阶段：开始发光" width="320" loading="lazy"> |
| 第三个请求 | **升维。**<br><img src="/images/modules/00/galaxy-brain-m-stage-3.jpg" alt="Galaxy Brain 第三阶段：光芒四射" width="320" loading="lazy"> |
| 第四个请求 | **超越。**<br><img src="/images/modules/00/galaxy-brain-m-stage-4.jpg" alt="Galaxy Brain 第四阶段：进入宇宙" width="320" loading="lazy"> |
| 排在最后的请求 | **然后——妈妈生的。**<br><img src="/images/modules/00/galaxy-brain-m-stage-5.jpg" alt="Galaxy Brain 第五阶段：宇宙级顿悟" width="320" loading="lazy"> |

第一个人的请求可能很快就开始返回。

后面的人却开始等十几秒。

几十秒。

甚至更久。

最奇怪的是：

**什么东西都没有真正坏掉。**

机器没有蓝屏。

进程没有退出。

API 还能连。

请求最后甚至大多都能得到答案。

但所有人都已经一致认为：

> 这玩意儿卡了。

昨天只有你一个人使用它的时候，它明明非常正常。

今天：

模型没变。

代码基本没变。

机器也没变。

只是多了几个人。

为什么一切突然就不一样了？

## 0.3 一个能跑的模型，并不是一个能用的系统

你把情况反馈给领导。

“现在人一多就会慢。”

领导想了一会儿。

“那是不是机器不够？”

你精神一振，正准备打开显卡报价。

领导补了一句：

“不过今年预算有点紧。”

“……”

“你们搞技术的先优化优化嘛。”

于是你重新坐回电脑前。

现在，你第一次不得不认真面对一个非常简单，但又没有那么简单的问题：

> **到底什么叫“慢”？**

是一个请求返回得太慢？

还是单位时间里处理不了足够多的请求？

为什么一个人使用的时候没问题，五个人一起使用就开始排队？

这些请求究竟在哪里等？

GPU 100% 是好事，还是说明它彻底没有余量？

如果 GPU 只有 30%，是不是说明还有 70% 的性能可以白捡？

换一张快两倍的显卡，系统一定会快两倍吗？

如果一次算多个请求可以提高吞吐量，但会让第一个请求多等一点时间，这笔交换值不值得？

你原本以为自己的问题是：

> **怎么让一个模型回答问题？**

现在它慢慢变成了：

> **怎么让一个有限的计算机系统，在面对真实 workload 和现实约束时，持续把这件事做好？**

这两个问题听起来很像。

但它们已经不是同一个问题了。

一开始，我们眼里的世界只有：

```text
prompt
  ↓
model.generate()
  ↓
answer
```

当这个模型真的开始被人使用以后，那个简单的箭头开始展开：

![一个模型服务从用户请求到 CPU、GPU、内存和显存的拓扑图](/images/modules/00/serving-request-topology.svg)

<small>图里的每一条边都可能藏着等待：请求可能在队列里等，运行时可能在准备 batch，GPU 可能在等数据，用户也可能在等第一个 token。<sup>[[3]](#ref-course-diagrams)</sup></small>

请求什么时候执行？

哪些请求可以一起执行？

谁先执行？

一个正在生成的请求会不会挡住后来的人？

已经计算过的东西有没有必要重新算？

显存不足的时候怎么办？

长请求和短请求碰到一起怎么办？

到这里，你已经不再只是在运行一个模型。

你开始运营一个**系统**。

## 0.4 “那直接用 vLLM 不就行了？”

看到这里，有一点 LLM Infra 经验的读者大概已经忍不住了：

> 不是兄弟，你为什么还在 `transformers.generate()`？

> `vllm serve` 不比你那手搓的服务好吗？

ok，当然行。

实际上，你刚才撞上的很多问题，今天早就已经有成熟的 inference engine 在专门解决，而且集众人之力解决的很好。

以 vLLM 为例，它现在支持 continuous batching、PagedAttention/KV Cache 管理、prefix caching、chunked prefill、speculative decoding，以及多种并行和分布式推理方式。

现实工作里，如果需求合适：

**你当然应该先用成熟系统。**

而不是入职第三天，当着办公室里所有的人郑重宣布：

> 我决定从零重新实现一个 LLM inference engine。

这大概不是一种特别值得鼓励的职业规划。

但作为学习者，我们还有另一个问题。

假设现在输入：

```bash
vllm serve Qwen/Qwen3-4B
```

发现：

> 哇，好快。

然后呢？

为什么它更快？

是 kernel 快了？

还是 batching 更好了？

为什么需要 KV Cache？

为什么 KV Cache 竟然会成为一个需要专门管理的系统资源？

为什么很长的 prompt 会干扰正在生成的请求？

为什么 throughput 上升以后，latency 可能反而恶化？

为什么明明显存还有剩余，却不一定还能塞进新请求？

如果这些问题都不知道，那么我们只是把：

```text
transformers
```

换成了：

```text
vLLM
```

系统暂时变好了。

理解没有增加多少。

## 0.5 我们当然也会拆 vLLM

这里可能需要提前声明一件稍微尴尬的事情。

你现在去小红书或者X上的 AI Infra 社区转一圈，很容易看到：

> 《vLLM 高频面试题》

> 《一文搞懂 PagedAttention》

> 《手撕 vLLM Scheduler》

> 《从源码看 XXX》

看多了以后，很容易产生一个错觉：

> 只要把一个流行框架的模块图和类名背下来，就理解了它背后的系统。

很遗憾，并没有。

而更尴尬的是：

**本课程后面也会他妈的拆 vLLM。**

而且可能真的拆不止一章。

区别并不在于“拆不拆”。

区别在于顺序。

我们更希望这样：

```text
真实问题
   ↓
观察
   ↓
测量
   ↓
建立 mental model
   ↓
做一个最朴素的实现
   ↓
撞上新的问题
   ↓
新的机制被逼出来
   ↓
再去看成熟系统为什么这么设计
```

而不是：

```text
vLLM 架构图
   ↓
Scheduler
   ↓
Block Manager
   ↓
Model Runner
   ↓
PagedAttention
   ↓
背完
```

我们真正想问的不是：

> **vLLM 有哪些模块？**

而是：

> **什么问题，逼着一个推理系统最后长出了这些模块？**

这也是 nano-vLLM 一类项目很适合作为教学桥梁的原因。

例如 nano-vLLM 一类轻量实现，会尝试保留 scheduler、KV Cache 管理、prefix caching、tensor parallelism、CUDA Graph 等关键机制，同时尽量压缩 production system 中庞大的工程复杂度。

它不是生产环境里 vLLM 的替代品。

恰恰相反。

它的价值之一就在于：

> **把生产系统里最值得观察的骨架，从大量工程复杂度里暂时剥出来。**

这和本课程后面会反复采用的一种方法很接近：

> **Toy-scale, production-shaped.**

系统可以很小。

模型可以很小。

实验可以只在一张消费级 GPU 上运行。

但我们希望复现的问题，和真实生产环境中的问题具有相同的形状。

所以以后我们可能真的会：

```text
model.generate()
      ↓
自己写一个傻乎乎的 batch
      ↓
自己维护 waiting / running queue
      ↓
发现 KV Cache 是资源
      ↓
做一个最小 scheduler
      ↓
看 nano-vLLM
      ↓
最后再看 vLLM
```

到了最后一步，源码应该不再只是一堆类名。

而应该让你产生一种感觉：

> 原来我们前面撞上的那个问题，在这里。

## 0.6 等一下，我们甚至还没有训练模型

到目前为止，我们已经折腾了这么久。

但有一件事情值得注意：

**我们一次模型都还没训练过。**

前面的 Qwen 是别人训练好的。

我们干的事情，本质上一直只是：

```python
model = load_model(...)
model.generate(...)
```

那么，如果有一天领导又走过来：

“小王啊。”

“嗯？”

“既然这个路线都跑通了，我们自己的模型是不是也可以搞一下？”

你可能会突然开始怀念只有五个同事同时访问 FastAPI 的那个上午。

因为训练又会把一整套新的系统问题带到你面前。

最简单的训练循环，看起来可能只是：

```python
for batch in dataloader:
    optimizer.zero_grad()

    loss = model(batch)

    loss.backward()

    optimizer.step()
```

在模型很小、数据很少的时候，它依然非常可爱。

然后我们继续做同一个游戏：

> **把数字往上加。**

模型大一点。

首先遇到：

> 放不下。

因为训练需要的不只是模型权重。

你还要保存梯度、激活、优化器状态以及大量临时计算结果。

于是，一个推理时能塞进显存的模型，到了训练时可能突然宣布：

```text
CUDA out of memory
```

一张 GPU 不够？

那就上八张。

然后新的问题来了：

> 八张 GPU 为什么不是八倍速度？

它们需要交换数据。

需要同步。

于是通信开始出现。

```text
compute
   ↓
communication
   ↓
compute
   ↓
communication
```

然后你不得不开始关心：

PCIe。

NVLink。

NIC。

RDMA。

bandwidth。

latency。

topology。

模型再大一点。

机器也不够了。

于是：

```text
1 GPU
  ↓
8 GPUs
  ↓
8 machines
  ↓
64 machines
  ↓
1024 machines
```

![机器学习 workload 从一台办公电脑逐步扩大到多卡服务器、计算集群和数据中心的插图](/images/modules/00/desk-to-datacenter.svg)

<small>规模每跨过一层，新的主要矛盾就会出现：先是容量，然后是通信、调度、故障，最后是电力和物理基础设施。<sup>[[3]](#ref-course-diagrams)</sup></small>

然后：

某张卡坏了怎么办？

某个节点掉了怎么办？

训练跑到第六天挂掉，难道从头再来？

于是你开始保存 checkpoint。

但 checkpoint 自己也可能有几百 GB，甚至更多。

一千张 GPU 同时往存储系统写数据的时候怎么办？

保存得太频繁，训练被 I/O 拖慢。

保存得太少，失败一次损失几个小时。

又一个典型的系统问题出现：

> **性能和可靠性之间怎么交换？**

还有数据。

刚开始：

```text
dataset/
    001
    002
    003
```

后来变成 TB。

再后来变成 PB。

昂贵的 GPU 坐在那里：

```text
GPU Utilization: 17%
```

不是因为它算得慢。

而是：

> 数据还没到。

于是存储、缓存、预取、shuffle、data loader、distributed filesystem 又全部进入了故事。

一个原本看起来只是：

> “算梯度”

的问题，

最后变成了一整套计算、内存、通信、I/O 和可靠性问题。

## 0.7 不过，这不是一门“怎么把模型训得更好”的课

走到这里，也应该说清楚这门课的边界。

传统的机器学习和深度学习课程已经会花大量时间讨论：

- 数据收集与清洗；
- 标注；
- 数据增强；
- 模型结构；
- Loss；
- Optimizer；
- 超参数；
- 训练策略；
- SFT；
- preference optimization；
- RL；
- 各种后训练方法；
- 模型效果评估。

这些问题当然很重要。

本课程也不会假装它们不存在。

当它们会显著改变系统行为时，我们还会重新遇到它们。

比如不同的训练方法，可能制造完全不同的显存占用、通信模式和计算模式。

某些后训练流程会同时出现 rollout、inference、training 和 weight synchronization，于是产生非常有趣的资源放置和调度问题。

不同的模型结构也会产生截然不同的计算和通信需求。

但是，我们选择的主要观察尺度并不是：

> **如何调整模型，让它的 accuracy 再提高 1%？**

而是：

> **为了执行这一次训练或者推理，计算机系统实际上被要求做什么？**

换句话说，在这门课里，我们经常会暂时把模型看成一个：

> **workload generator。**

模型参数量。

序列长度。

Batch size。

模型结构。

训练算法。

推理策略。

它们最终都会被翻译成对机器的一组需求：

![模型和算法配置被翻译为计算、内存、通信、I/O、同步和状态需求](/images/modules/00/workload-generator.svg)

<small>Systems 视角并不抹掉模型，而是把模型选择继续向下翻译，直到它们变成机器必须实际承担的资源需求和执行约束。<sup>[[3]](#ref-course-diagrams)</sup></small>

所以，一个 Transformer 在本课程里当然首先是一个模型。

但当我们戴上 Systems 的眼镜以后，它还会变成：

```text
GEMM
Attention
Memory Traffic
KV State
Communication
Synchronization
```

DDP 也不只是一个 PyTorch API。

我们更想知道：

```text
每张 GPU 在算什么？
什么时候通信？
通信多少？
谁在等待谁？
```

后训练也不只是各种算法名字。

Systems 视角下，我们可能看到：

```text
rollout
   ↓
inference workload
   ↓
evaluation / reward
   ↓
training workload
   ↓
weight synchronization
   ↓
rollout
```

这就是本课程和传统 ML 教程观察同一件事情时，摄像机所在的位置不同。

传统机器学习课程更经常问：

> **模型学到了什么？**

而我们更多会问：

> **为了让它学到这些东西，机器究竟做了什么？**

两者并不冲突。

只是观察的是同一个过程的不同层次。

## 0.8 现在，我们继续把数字往上加

到这里，我们其实已经有了两条故事线。

一条是推理：

```text
1 user
  ↓
5 users
  ↓
500 users
  ↓
50000 users
```

另一条是训练：

```text
1 GPU
  ↓
8 GPUs
  ↓
64 GPUs
  ↓
1024 GPUs
```

继续往上。

这让我想起 xkcd *What If?* 里的一个经典问题：<sup>[[2]](#ref-xkcd-laser)</sup>

> 如果地球上的所有人同时拿激光笔照向月球，能够让月球变色吗？

普通激光笔当然不行。

数十亿支普通激光笔叠加起来，相对于照在月球上的太阳光，仍然微不足道。

于是 Randall Munroe 开始不断提高功率。

普通激光笔不够。

换更强的。

还不够。

继续。

再继续。

直到原本几毫瓦、几乎完全无害的玩具问题，一路被放大成涉及行星级能源和灾难性物理后果的问题。

<figure>
  <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 1rem; align-items: end;">
    <div>
      <img src="/images/modules/00/xkcd-laser-pointer-5mw.png" alt="数十亿人使用普通 5 毫瓦激光笔照射月球，月面看不出变化" loading="lazy">
      <p style="text-align: center; margin-top: 0.4rem;"><strong>5 mW / 人：</strong>什么也没发生。</p>
    </div>
    <div>
      <img src="/images/modules/00/xkcd-laser-pointer-terawatt.png" alt="数十亿人使用 500 太瓦激光照射月球，月球被推出画面" loading="lazy">
      <p style="text-align: center; margin-top: 0.4rem;"><strong>500 TW / 人：</strong>月球没了。</p>
    </div>
  </div>
  <figcaption>
    同一个问题，把数字往上加到最后，连问题的边界都变了。
  </figcaption>
</figure>

这个例子真正有意思的地方，不只是“最后会发生什么”。

而是：

> **规模增加以后，问题并不只是原来的问题乘上 N。**

新的约束会开始出现。

一支激光笔的时候，你根本不会考虑地球能源系统。

功率不断扩大以后：

能源出现了。

散热出现了。

大气出现了。

材料出现了。

最后连月球本身都成了系统的一部分。

ML Systems 也是一样。

一张 GPU：

> 模型放得下吗？

八张 GPU：

> 怎么并行？

一百张：

> 怎么通信？

一千张：

> 拓补呢？存储呢？调度呢？故障呢？

再继续放大：

> 电从哪里来？

> 热怎么出去？

> 网络怎么铺？

> 光模块够不够？

> 数据中心建在哪里？

于是有一天你抬头发现：

我们一开始明明只是写了：

```python
model.generate(...)
```

为什么我们现在居然开始讨论”水电还是核电“了？

## 0.9 从 Python 脚本，到物理基础设施

这并不是纯粹为了制造戏剧效果。

2025 年 1 月，SoftBank 与 OpenAI 宣布牵头成立美国人工智能基础设施项目“星际之门”（Stargate Project），Oracle 和 MGX 也是初始出资方。项目最初宣布计划在四年内投入最高 5000 亿美元建设 AI 基础设施，并立即开始部署其中 1000 亿美元。SoftBank 主要承担财务责任，OpenAI 主要承担运营责任。<sup>[[4]](#ref-stargate-announcement)</sup>

这里的“5000 亿美元”，不能简单理解成：

> OpenAI 准备下单买 5000 亿美元的 GPU。

它更像是一个覆盖整条基础设施链路的长期投资承诺。

具体来说，至少包括下面几个层次。

![Stargate 从资本组织、土地电力到芯片集群、系统运营和战略能力的五层结构图](/images/modules/00/stargate-infrastructure-stack.svg)

<small>5000 亿美元指向的不是某一种硬件，而是一条从资本和物理建设一直延伸到可用 AI 能力的完整基础设施链。<sup>[[3]](#ref-course-diagrams)</sup></small>

### 第一层：钱和组织

如此巨大的基础设施不可能由一家模型公司独自完成。

这里面需要有人融资，有人承担资本开支，有人建设数据中心，有人提供云和数据库基础设施，有人提供芯片、网络和软件栈，还有人负责把这些资源最终变成可以训练和服务模型的计算系统。

所以 Stargate 首先是一种组织结构：

```text
资本
  ↓
项目公司
  ↓
数据中心开发商 / 云厂商 / 芯片厂商 / 网络设备商
  ↓
可被 OpenAI workload 使用的计算基础设施
```

### 第二层：土地、电力和建筑

GPU 不是插在空气里运行的。

在一块加速卡进入集群之前，需要先有土地、园区、建筑、供电接入、变电设施、备用电源、冷却系统、消防系统和物理安全。

当项目规模以 GW，也就是十亿瓦为单位讨论时，电力已经不再是服务器规格表最后一行的 TDP。

它开始变成：

> 这个地区的电网能不能支持项目存在？

Stargate 后续公布的规划更加直观：截至 2025 年 9 月，OpenAI 宣称其已公布站点合计接近 7 GW 的规划容量，并对应未来三年超过 4000 亿美元的投资规模，目标仍然指向最初承诺的 10 GW、5000 亿美元。<sup>[[5]](#ref-stargate-sites)</sup>

### 第三层：芯片、内存、网络和存储

有了楼和电，还没有得到一个能工作的 AI 集群。

你还需要：

- GPU 或其他加速器；
- HBM 与主机内存；
- 机架和服务器；
- NIC、交换机和光模块；
- 高速互连；
- 本地与分布式存储；
- checkpoint、数据集和模型权重的传输路径。

几百万张卡堆在一起，不会自动变成一台更大的计算机。

它们只有在拓扑、通信、调度和软件栈共同工作时，才可能成为一个可以使用的系统。

### 第四层：把基础设施变成训练和推理能力

即使硬件全部到位，事情仍然没有结束。

训练 workload 应该放到哪些机器？

模型如何并行？

失败以后如何恢复？

数据如何持续供给？

推理请求如何调度？

训练、实验和线上服务如何争夺同一批资源？

利用率低的时候，是不是应该塞入更多任务？利用率很高的时候，又该优先保证谁？

**从“拥有算力”到“获得模型能力”之间，仍然隔着一个完整的 ML system。**

### 第五层：工业和国家战略叙事

Stargate 的官方叙事从来不只是技术项目。

它同时讨论美国的 AI 领导地位、就业、再工业化、供应链和国家安全。换句话说，当 AI 基础设施达到这个规模以后，它已经不再只是某家公司的 IT 预算，而开始被当作类似能源、通信和制造业基础设施的战略能力。<sup>[[4]](#ref-stargate-announcement)</sup>

说得不那么客气一点：

> **Stargate 这套叙事，都快让国模给干碎了。**

但这里被“干碎”的，并不是数据中心本身。

被击穿的是一种过于简单的线性想象：

```text
更多的钱
  ↓
更多的 GPU
  ↓
更大的数据中心
  ↓
更强的模型
```

以 DeepSeek-V3 为代表的国产模型与系统工作提醒了整个行业：模型能力并不只由你拥有多少张卡决定，也取决于模型结构、数值精度、并行策略、通信设计、负载均衡、训练框架，以及算法和硬件能不能共同设计。

DeepSeek-V3 的技术报告强调了 MoE、FP8 训练、计算与通信重叠等设计，并报告完整训练使用约 278.8 万 H800 GPU 小时。这个数字当然一点也不“小”，但它展示了另一条同样重要的 scaling 路径：不是只问“还能增加多少机器”，而是问“能不能让每一张卡完成更多有效工作”。<sup>[[6]](#ref-deepseek-v3)</sup>

所以，更准确的评价应该是：

> **国产模型没有证明基础设施不重要；它们证明了“基础设施规模几乎等于模型能力”这个叙事远远不够。**

事实上，效率提升和基础设施扩张甚至不是相反方向。

如果一种系统设计能让同样的机器完成更多工作，那么一座大型数据中心可以训练更多模型、服务更多用户、尝试更多实验。

规模决定资源上限。

系统效率决定我们离这个上限还有多远。

这两件事情相乘，才是最终能够获得的能力。

![扩大资源规模与提升系统效率两条路径共同决定最终可获得能力的对照图](/images/modules/00/scale-and-efficiency.svg)

<small>Stargate 主要抬高资源上限；DeepSeek 一类系统工作主要提高单位资源能够转化出的有效工作。最终能力同时受两者影响。<sup>[[3]](#ref-course-diagrams)</sup></small>

注意这里越来越频繁出现的词：

不是：

> “一个更聪明的模型”。

而是：

> **基础设施。**

我们已经从：

```text
Python
```

一路走到了：

```text
model
  ↓
runtime
  ↓
GPU
  ↓
HBM
  ↓
server
  ↓
network
  ↓
cluster
  ↓
datacenter
  ↓
power
  ↓
physical infrastructure
```

这就是这一节最想保留的张力。

Stargate 在问：

> **我们能不能把机器的规模继续推大？**

DeepSeek 在问：

> **同样的机器，能不能完成更多有效工作？**

一个抬高资源上限。

另一个缩短系统与上限之间的距离。

它们并不是两套互相否定的答案，而是在逼我们正视同一件事情：

> **现代机器学习的能力，已经越来越难脱离整个计算系统单独讨论。**

## 0.10 所以，为什么需要 MLSys？

现在终于可以回到这一章的标题。

为什么需要 Machine Learning Systems？

不是因为 AI 很火，所以我们需要再发明一个新的缩写。

也不是因为 PyTorch、CUDA、Kubernetes、vLLM 太多了，所以需要一本新的工具说明书。

而是因为当机器学习 workload 不断走出 notebook、走出单机、走进真实生产环境并不断扩大时，一大堆原本分散在计算机科学不同领域里的问题，开始同时出现在我们面前：

计算机体系结构。

操作系统。

编译器。

网络。

分布式系统。

存储。

数据库。

性能工程。

调度。

可靠性。

控制。

软件工程。

它们并没有因为机器学习的出现而过时。

恰恰相反。

机器学习带来了一种庞大、昂贵、复杂而且极其挑剔的 workload，在这之前，从来没有一个问题能把让他们重新挤到了一张桌子上。

因此，这门课真正想训练的并不是：

> **记住最多的 AI Infra 名词。**

而是一套更朴素的思考方式：

![从问题、观察和测量，到模型、机制、实验、取舍与决策，再回到测量的闭环流程](/images/modules/00/problem-driven-loop.svg)

<small>这不是一次性的流水线。每个决策都会改变系统，因此终点总会重新回到观察与测量。<sup>[[3]](#ref-course-diagrams)</sup></small>

我们会用很多工具。

会碰 GPU。

会碰 CUDA，ROCm。

会碰 PYTorch。

会写 distributed training。

会碰 Kubernetes。

会看 vLLM。

甚至真的会花一点时间拆它的源码。

但工具只是某个时代对问题给出的答案。

问题本身通常活得更久。

几年以后，也许今天流行的框架已经被新的框架替代。

但你仍然需要问：

> 我的 workload 是什么？

> 系统真正慢在哪里？

> 我有什么证据？

> 时间花在了什么地方？

> 当前瓶颈是什么资源？

> 为什么这个机制有效？

> 它获得了什么，又牺牲了什么？

> 如果规模扩大十倍，现在的结论还成立吗？

如果学完这门课以后，你只是多背了几十道 AI Infra 面试题，

那大概说明我们失败了。

如果有一天，你碰到一个从没见过的新模型、新硬件、新系统，

第一反应不是搜索：

> 《XXX 高频面试题》

而是先问：

> **它到底给机器制造了什么 workload？**

然后开始观察、测量、建立模型、验证假设，

那我们大概做对了一点什么。

## 0.11 所以，先别急着优化

现在回到办公室。

领导刚刚告诉你：

> “今年预算有点紧，你们技术先优化优化。”

桌子下面仍然只有：

```text
Ryzen 7 9700X
64 GB RAM
RTX 5070
```

以及一个：

> 一个人用起来挺好，五个人一起用就开始卡的模型服务。

你当然可以马上：

换框架。

调 batch。

复制一份“vLLM 最佳实践”。

把某个参数从 32 改成 64。

甚至偷偷打听一下 RTX 5090 的采购价格。

但在做任何事情之前，还有一个更加基本的问题：

> **你凭什么认为自己知道该优化哪里？**

如果你不知道时间花在了哪里，

不知道 GPU 在做什么，

不知道 CPU 在做什么，

不知道数据在哪里等待，

不知道用户真正关心的是 latency 还是 throughput，

那么所谓“优化”，很多时候只是：

> 随机修改系统，直到 benchmark 看起来变好。

![工程师先用测量和证据定位瓶颈，而不是立即购买新 GPU 的插图](/images/modules/00/measure-before-upgrade.svg)

<small>采购和优化都可能是正确答案，但应该由测量结果决定，而不是由监控页面里最显眼的那个百分比决定。<sup>[[3]](#ref-course-diagrams)</sup></small>

所以接下来，我们先不买 GPU。

也先不拆 vLLM。

我们先学第一件事情：

**测量。**

看看这个系统，到底在干什么。

## 图像与文献参考

1. <span id="ref-galaxy-brain"></span>Jon Manning，*High Resolution CC-0 Licensed Galaxy Brain Images*，Secret Lab Institute，2021。[原始模板与素材说明](https://secretlabinstitute.wordpress.com/2021/02/15/cc-0-licensed-galaxy-brain-images/)。本章使用其男性角色五阶段版本，并将图片缩放、转换为 JPEG；该页面将组合图以 CC0 发布，同时列出了组成素材所需的署名信息。
2. <span id="ref-xkcd-laser"></span>Randall Munroe，*Laser Pointer*，xkcd *What If?* #13。[原文](https://what-if.xkcd.com/13/)；[xkcd 许可说明](https://xkcd.com/license.html)。本章节选其中的 `laser_pointer_5mw.png` 与 `laser_pointer_terawatt.png`，未修改画面，依 CC BY-NC 2.5 用于非商业课程。
3. <span id="ref-course-diagrams"></span>本章使用的结构图与叙事插图均为本课程原创 SVG，包括服务请求拓扑、workload 转译、问题驱动闭环、Stargate 基础设施栈、规模与效率对照，以及办公室、规模放大和测量场景插图。
4. <span id="ref-stargate-announcement"></span>OpenAI、SoftBank，*Announcing The Stargate Project*，2025-01-21。[官方公告](https://openai.com/index/announcing-the-stargate-project/)。
5. <span id="ref-stargate-sites"></span>OpenAI，*OpenAI, Oracle, and SoftBank Expand Stargate with Five New AI Data Center Sites*，2025-09-23。[官方进展公告](https://openai.com/index/five-new-stargate-sites/)。
6. <span id="ref-deepseek-v3"></span>DeepSeek-AI，*DeepSeek-V3 Technical Report*，arXiv:2412.19437，2024。[官方代码库与报告入口](https://github.com/deepseek-ai/DeepSeek-V3)。
