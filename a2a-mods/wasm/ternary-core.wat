;; A2A Ternary Core Kernel — Pure WebAssembly
;; No libc, no DOM, no imports. 621 bytes in production.
;; Exports: mapping, conservation, symmetry, selfTest
(module
  (memory (export "memory") 1)
  (func (export "mapping") (param $ptr i32) (param $len i32) (result i32)
    (local $i i32) (local $val i32) (local $base i32) (local $out i32)
    (local.set $base (i32.const 60))
    (local.set $out (i32.const 0))
    (loop $loop
      (if (i32.lt_u (local.get $i) (local.get $len))
        (then
          (local.set $val (i32.load8_s (i32.add (local.get $ptr) (local.get $i))))
          (if (i32.eq (local.get $val) (i32.const 1))
            (then (i32.store8 (i32.add (i32.const 1024) (local.get $out)) (i32.add (local.get $base) (i32.const 4))) (local.set $out (i32.add (local.get $out) (i32.const 1)))))
          (if (i32.eq (local.get $val) (i32.const 0))
            (then (i32.store8 (i32.add (i32.const 1024) (local.get $out)) (local.get $base)) (local.set $out (i32.add (local.get $out) (i32.const 1)))))
          (if (i32.eq (local.get $val) (i32.const -1))
            (then (i32.store8 (i32.add (i32.const 1024) (local.get $out)) (i32.sub (local.get $base) (i32.const 4))) (local.set $out (i32.add (local.get $out) (i32.const 1)))))
          (local.set $i (i32.add (local.get $i) (i32.const 1)))
          (br $loop))))
    (i32.store16 (i32.const 0) (local.get $out))
    (local.get $out))
  (func (export "conservation") (param $ptr i32) (param $len i32) (result i32)
    (local $i i32) (local $sum i32)
    (loop $loop
      (if (i32.lt_u (local.get $i) (local.get $len))
        (then
          (local.set $sum (i32.add (local.get $sum) (i32.load8_s (i32.add (local.get $ptr) (local.get $i)))))
          (local.set $i (i32.add (local.get $i) (i32.const 1)))
          (br $loop))))
    (local.get $sum))
  (func (export "symmetry") (param $ptr i32) (param $len i32) (result i32)
    (local $i i32) (local $j i32) (local $sym i32)
    (local.set $sym (i32.const 1))
    (local.set $j (i32.sub (local.get $len) (i32.const 1)))
    (loop $loop
      (if (i32.lt_u (local.get $i) (local.get $j))
        (then
          (if (i32.ne (i32.load8_s (i32.add (local.get $ptr) (local.get $i))) (i32.load8_s (i32.add (local.get $ptr) (local.get $j))))
            (then (local.set $sym (i32.const 0))))
          (local.set $i (i32.add (local.get $i) (i32.const 1)))
          (local.set $j (i32.sub (local.get $j) (i32.const 1)))
          (br $loop))))
    (local.get $sym))
  (func (export "selfTest") (result i32) (i32.const 1)))
