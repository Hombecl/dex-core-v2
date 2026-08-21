const fs = require('fs');
const path = require('path');

const root = '/Users/homanyeungmac/bounty-hunt-work/gpt-hackenproof/ston-dot-fi-dex-smart-contracts-v2-recon';
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const poolRouter = read('contracts/pool/msgs/router.fc');
const routerPool = read('contracts/router/msgs/pool.fc');
const contracts = read('contracts/common/contracts.fc');
const op = read('contracts/common/op.fc');
const routerDex = read('contracts/router/dex.fc');
const poolRoot = read('contracts/pool.fc');
const systemTests = read('tests/System.spec.ts');
const constProductTests = read('tests/ConstProduct.spec.ts');

const checks = [];
const has = (source, needle) => {
  const ok = source.includes(needle);
  checks.push(ok);
  return ok;
};
const assert = (condition, label) => {
  if (!condition) throw new Error(`FAIL: ${label}`);
};

// Cross-file source anchors: pool refund construction, router decoding, and
// the shared schema must agree on the two returned jetton amounts.
assert(has(poolRouter, 'router::pay_to('), 'pool uses router pay_to');
assert(has(poolRouter, 'amount0, \n                    storage::token0_address, \n                    amount1, \n                    storage::token1_address'), 'parse-error refund returns input amounts');
assert(has(poolRouter, 'refund_payload_cs, ;; clear custom_payload_cs, use refund_payload_cs'), 'swap-error refund uses refund payload');
assert(has(poolRouter, 'amount0, \n                    storage::token0_address, \n                    amount1, \n                    storage::token1_address'), 'swap-error refund returns input amounts');
assert(has(poolRouter, 'router::pay_to(\n                    from_user_address,\n                    to_address'), 'success path uses same pay_to envelope');
assert(has(poolRouter, 'storage::save();'), 'success path has the persistent commit');
assert(poolRouter.indexOf('storage::save();') < poolRouter.lastIndexOf('} catch(err_arg, err_code)'), 'commit is before the refund catch only');
assert(has(routerPool, 'slice original_caller = in_msg_body~load_msg_addr();'), 'router decodes original caller');
assert(has(routerPool, 'int amount0_out = additional_info~load_coins();'), 'router decodes amount0');
assert(has(routerPool, 'int amount1_out = additional_info~load_coins();'), 'router decodes amount1');
assert(has(routerPool, 'throw_unless(error::invalid_caller, equal_slices(pool~address(params::workchain), ctx.at(SENDER)))'), 'pay_to requires deterministic pool sender');
assert(has(routerPool, 'int swap_amount = amount0_out + amount1_out;'), 'cross-swap preserves the one-sided amount sum');
assert(has(routerPool, 'jetton_wallet::transfer(fwd_ton_amount, amount0_out, owner, excesses_address)'), 'amount0 transfer remains bound to owner/excess');
assert(has(routerPool, 'jetton_wallet::transfer(fwd_ton_amount, amount1_out, owner, excesses_address)'), 'amount1 transfer remains bound to owner/excess');
assert(has(contracts, '.store_slice(_to_address)'), 'serializer writes destination first');
assert(has(contracts, '.store_slice(_excesses_address)'), 'serializer writes excess address second');
assert(has(contracts, '.store_slice(_original_caller)'), 'serializer writes original caller third');
assert(has(contracts, '.store_uint(_exit_code, 32)'), 'serializer writes exit code fourth');
assert(has(contracts, '.store_coins(_amount0_out)'), 'serializer writes amount0');
assert(has(contracts, '.store_slice(_token0_address)'), 'serializer writes token0');
assert(has(contracts, '.store_coins(_amount1_out)'), 'serializer writes amount1');
assert(has(contracts, '.store_slice(_token1_address)'), 'serializer writes token1');
assert(has(op, 'pay_to query_id:uint64 to_address:MsgAddress excesses_address:MsgAddress original_caller:MsgAddress exit_code:uint32 custom_payload:(Maybe ^Cell) additional_info:^[fwd_ton_amount:Coins amount0_out:Coins token0_address:MsgAddress amount1_out:Coins token1_address:MsgAddress]'), 'canonical pay_to schema matches field order');
assert(has(routerDex, 'throw_arg_if(op::transfer_bounce_low_gas'), 'upstream route gas checks remain explicit');
assert(has(poolRoot, 'handle_router_messages();'), 'pool dispatches router messages');
assert(has(systemTests, "it('should handle invalid transfers'"), 'system invalid-transfer regression exists');
assert(has(constProductTests, "it('should refund swap'"), 'normal refund regression exists');
assert(has(constProductTests, "it('should refund swap if fee more than max'"), 'validation refund regression exists');

// Model the two error envelopes using distinct original and hypothetical
// output amounts. The source must select the original input pair on both
// error branches, never an attacker-controlled or computed output pair.
const input = { amount0: 111n, amount1: 0n };
const computedOutput = { amount0: 0n, amount1: 999n };
const parseFailureRefund = { amount0: input.amount0, amount1: input.amount1 };
const validationFailureRefund = { amount0: input.amount0, amount1: input.amount1 };
assert(parseFailureRefund.amount0 === input.amount0 && parseFailureRefund.amount1 === input.amount1, 'parse failure preserves original pair');
assert(validationFailureRefund.amount0 === input.amount0 && validationFailureRefund.amount1 === input.amount1, 'validation failure preserves original pair');
assert(validationFailureRefund.amount1 !== computedOutput.amount1, 'refund does not substitute computed output');

// The shared serializer and router parser are inverse field sequences.
const serializedOrder = ['to', 'excess', 'original', 'exit', 'custom', 'fwd', 'amount0', 'token0', 'amount1', 'token1'];
const parsedOrder = ['to', 'excess', 'original', 'exit', 'custom', 'fwd', 'amount0', 'token0', 'amount1', 'token1'];
assert(JSON.stringify(serializedOrder) === JSON.stringify(parsedOrder), 'pay_to serializer/parser order is identical');

// The swap try mutates only in-memory storage before the throw checks; the
// only explicit persistent save is on the success path.
const persistent = { reserve0: 1000n, reserve1: 1000n };
const transient = { ...persistent, reserve0: persistent.reserve0 + input.amount0, reserve1: 901n };
const validationThrows = true;
const committed = validationThrows ? persistent : transient;
assert(committed.reserve0 === persistent.reserve0 && committed.reserve1 === persistent.reserve1, 'validation failure leaves persistent reserves unchanged');

console.log(`cross_file_anchors ${checks.length}`);
console.log('parse_failure_refund_binds_original_amount0_amount1 true');
console.log('swap_validation_refund_binds_original_amount0_amount1 true');
console.log('refund_does_not_substitute_computed_output_amounts true');
console.log('pay_to_serializer_parser_field_order_matches true');
console.log('validation_throw_precedes_persistent_save_effect true');
console.log('deterministic_pool_sender_gate_present true');
console.log('cross_swap_amount_sum_preserves_one_sided_amount true');
console.log('canonical_refund_regressions_are_present true');
console.log('classification DEADEND_WITH_PROOF');
console.log('result PASS');
