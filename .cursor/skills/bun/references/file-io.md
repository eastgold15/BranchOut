# 文件 I/O

> Fetch the complete documentation index at: https://bun.com/docs/llms.txt
> Bun 提供了一组优化的 API 用于读取和写入文件。

<Note>
  本文档中介绍的 `Bun.file` 和 `Bun.write` API 经过了高度优化，是使用 Bun 执行文件系统任务时的推荐方式。对于 `Bun.file` 尚不可用的操作（如 `mkdir` 或 `readdir`），你可以使用 Bun /runtime/nodejs-compat#node-fs 的 https://nodejs.org/api/fs.html 模块实现。
</Note>

***

## 读取文件 (`Bun.file()`)

`Bun.file(path): BunFile`

使用 `Bun.file(path)` 函数创建一个 `BunFile` 实例。一个 `BunFile` 代表一个延迟加载的文件；初始化它并不会实际从磁盘读取文件。

```ts theme={"theme":{"light":"github-light","dark":"dracula"}}
const foo = Bun.file("foo.txt"); // 相对于当前工作目录 (cwd)
foo.size; // 字节数
foo.type; // MIME 类型
```

该引用符合 https://developer.mozilla.org/en-US/docs/Web/API/Blob 接口规范，因此可以以多种格式读取内容。

```ts theme={"theme":{"light":"github-light","dark":"dracula"}}
const foo = Bun.file("foo.txt");

await foo.text(); // 以字符串形式获取内容
await foo.json(); // 以 JSON 对象形式获取内容
await foo.stream(); // 以 ReadableStream 形式获取内容
await foo.arrayBuffer(); // 以 ArrayBuffer 形式获取内容
await foo.bytes(); // 以 Uint8Array 形式获取内容
```

也可以使用数值型的https://en.wikipedia.org/wiki/File_descriptor或 `file://` URL 来创建文件引用。

```ts theme={"theme":{"light":"github-light","dark":"dracula"}}
Bun.file(1234);
Bun.file(new URL(import.meta.url)); // 指向当前文件的引用
```

一个 `BunFile` 可以指向磁盘上不存在文件的位置。

```ts theme={"theme":{"light":"github-light","dark":"dracula"}}
const notreal = Bun.file("notreal.txt");
notreal.size; // 0
notreal.type; // "text/plain;charset=utf-8"
const exists = await notreal.exists(); // false
```

默认的 MIME 类型是 `text/plain;charset=utf-8`，但可以通过向 `Bun.file` 传递第二个参数来覆盖它。

```ts theme={"theme":{"light":"github-light","dark":"dracula"}}
const notreal = Bun.file("notreal.json", { type: "application/json" });
notreal.type; // => "application/json;charset=utf-8"
```

为了方便，Bun 将 `stdin`、`stdout` 和 `stderr` 作为 `BunFile` 的实例公开。

```ts theme={"theme":{"light":"github-light","dark":"dracula"}}
Bun.stdin; // 只读
Bun.stdout;
Bun.stderr;
```

### 删除文件 (`file.delete()`)

你可以通过调用 `.delete()` 函数来删除文件。

```ts theme={"theme":{"light":"github-light","dark":"dracula"}}
await Bun.file("logs.json").delete();
```

***

## 写入文件 (`Bun.write()`)

`Bun.write(destination, data): Promise<number>`

`Bun.write` 函数是一个多用途工具，用于将各种有效载荷写入磁盘。

第一个参数是 `destination`（目标），可以是以下任何类型：

* `string`：文件系统位置的路径。使用 `"path"` 模块来操作路径。
* `URL`：`file://` 描述符。
* `BunFile`：文件引用。

第二个参数是要写入的数据。它可以是以下任何类型：

* `string`
* `Blob`（包括 `BunFile`）
* `ArrayBuffer` 或 `SharedArrayBuffer`
* `TypedArray`（`Uint8Array` 等）
* `Response`



要将字符串写入磁盘：

```ts theme={"theme":{"light":"github-light","dark":"dracula"}}
const data = `It was the best of times, it was the worst of times.`;
await Bun.write("output.txt", data);
```

要将文件复制到磁盘上的另一个位置：

```ts theme={"theme":{"light":"github-light","dark":"dracula"}}
const input = Bun.file("input.txt");
const output = Bun.file("output.txt"); // 尚不存在！
await Bun.write(output, input);
```

要将字节数组写入磁盘：

```ts theme={"theme":{"light":"github-light","dark":"dracula"}}
const encoder = new TextEncoder();
const data = encoder.encode("datadatadata"); // Uint8Array
await Bun.write("output.txt", data);
```

要将文件写入 `stdout`：

```ts theme={"theme":{"light":"github-light","dark":"dracula"}}
const input = Bun.file("input.txt");
await Bun.write(Bun.stdout, input);
```

要将 HTTP 响应体写入磁盘：

```ts theme={"theme":{"light":"github-light","dark":"dracula"}}
const response = await fetch("https://bun.com");
await Bun.write("index.html", response);
```

***

## 使用 `FileSink` 进行增量写入

Bun 提供了一个名为 `FileSink` 的原生增量文件写入 API。要从 `BunFile` 获取 `FileSink` 实例：

```ts theme={"theme":{"light":"github-light","dark":"dracula"}}
const file = Bun.file("output.txt");
const writer = file.writer();
```

要增量写入文件，请调用 `.write()`。

```ts theme={"theme":{"light":"github-light","dark":"dracula"}}
const file = Bun.file("output.txt");
const writer = file.writer();

writer.write("it was the best of times\n");
writer.write("it was the worst of times\n");
```

这些数据块将在内部进行缓冲。要将缓冲区刷新到磁盘，请使用 `.flush()`。这将返回刷新的字节数。

```ts theme={"theme":{"light":"github-light","dark":"dracula"}}
writer.flush(); // 将缓冲区写入磁盘
```

当 `FileSink` 的*高水位标记*（high water mark）达到时，缓冲区也会自动刷新；也就是说，当其内部缓冲区已满时。这个值是可以配置的。

```ts theme={"theme":{"light":"github-light","dark":"dracula"}}
const file = Bun.file("output.txt");
const writer = file.writer({ highWaterMark: 1024 * 1024 }); // 1MB
```

要刷新缓冲区并关闭文件：

```ts theme={"theme":{"light":"github-light","dark":"dracula"}}
writer.end();
```

请注意，默认情况下，`bun` 进程会一直保持活动状态，直到这个 `FileSink` 被显式地使用 `.end()` 关闭。若要退出此行为，你可以让实例“取消引用”（unref）。

```ts theme={"theme":{"light":"github-light","dark":"dracula"}}
writer.unref();

// 稍后如果需要可以重新引用 (re-ref)
writer.ref();
```

***

## 目录

Bun 的 `node:fs` 实现速度很快。在 Bun 中使用 `node:fs` 来处理目录。

### 读取目录 (readdir)

要在 Bun 中读取目录，请使用 `node:fs` 中的 `readdir`。

```ts theme={"theme":{"light":"github-light","dark":"dracula"}}
import { readdir } from "node:fs/promises";

// 读取当前目录下的所有文件
const files = await readdir(import.meta.dir);
```

#### 递归读取目录

要在 Bun 中递归读取目录，请使用带有 `recursive: true` 的 `readdir`。

```ts theme={"theme":{"light":"github-light","dark":"dracula"}}
import { readdir } from "node:fs/promises";

// 递归读取当前目录下的所有文件
const files = await readdir("../", { recursive: true });
```

### 创建目录 (mkdir)

要递归创建目录，请在 `node:fs` 中使用 `mkdir`：

```ts theme={"theme":{"light":"github-light","dark":"dracula"}}
import { mkdir } from "node:fs/promises";

await mkdir("path/to/dir", { recursive: true });
```


***

## 参考 (Reference)

```ts theme={"theme":{"light":"github-light","dark":"dracula"}}
interface Bun {
  stdin: BunFile;
  stdout: BunFile;
  stderr: BunFile;

  file(path: string | number | URL, options?: { type?: string }): BunFile;

  write(
    destination: string | number | BunFile | URL,
    input: string | Blob | ArrayBuffer | SharedArrayBuffer | TypedArray | Response,
  ): Promise<number>;
}

interface BunFile {
  readonly size: number;
  readonly type: string;

  text(): Promise<string>;
  stream(): ReadableStream;
  arrayBuffer(): Promise<ArrayBuffer>;
  json(): Promise<any>;
  writer(params: { highWaterMark?: number }): FileSink;
  exists(): Promise<boolean>;
}

export interface FileSink {
  write(chunk: string | ArrayBufferView | ArrayBuffer | SharedArrayBuffer): number;
  flush(): number | Promise<number>;
  end(error?: Error): number | Promise<number>;
  start(options?: { highWaterMark?: number }): void;
  ref(): void;
  unref(): void;
}
```